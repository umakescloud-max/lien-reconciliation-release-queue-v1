import { useState } from "react";
import {
  AppShell,
  ApprovalQueue,
  AuditLog,
  DocumentViewer,
  Masked,
  businessDaysBetween,
  formatDate,
  useActivity,
  useDemoState,
  type ApprovalItem,
} from "@kit";
import { NAV } from "../nav";
import {
  BRAND,
  EDGE_LIEN_ID,
  LIENS_SEED,
  NOTES_SEED,
  PERSONA_NAME,
  PERSONA_ROLE,
  daysLabel,
  usd,
  type Lien,
  type LienNote,
} from "../seed";

export default function Releases() {
  const [liens, setLiens] = useDemoState<Lien[]>("liens", LIENS_SEED);
  const [notes, setNotes] = useDemoState<LienNote[]>("lienNotes", NOTES_SEED);
  const [returned, setReturned] = useDemoState<string[]>("returned-to-discrepancies", []);
  const { logAction } = useActivity();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const returnedSet = new Set(returned);
  const queue = liens
    .filter(
      (l) =>
        l.lien_status === "release review" ||
        (l.lien_id === EDGE_LIEN_ID && l.lien_status === "discrepancy" && !returnedSet.has(l.lien_id))
    )
    .sort((a, b) => {
      if (a.lien_id === EDGE_LIEN_ID) return -1;
      if (b.lien_id === EDGE_LIEN_ID) return 1;
      return 0;
    });

  const focus =
    queue.find((l) => l.lien_id === selectedId) ??
    queue.find((l) => l.lien_id === EDGE_LIEN_ID) ??
    queue[0] ??
    null;
  const others = queue.filter((l) => l.lien_id !== focus?.lien_id);

  const toItem = (lien: Lien): ApprovalItem => {
    const days = lien.disbursement_deadline
      ? businessDaysBetween(new Date(), new Date(lien.disbursement_deadline))
      : null;
    const subtitle =
      lien.lien_status === "release review"
        ? `${lien.attorney_firm} — ${usd(lien.lien_balance)} balance, ${
            days === null ? "no deadline set" : `${daysLabel(days)} to disbursement`
          }`
        : `${lien.attorney_firm} — ${lien.discrepancy_reason ?? "payment short of balance, no reduction on file"}`;
    return {
      id: lien.lien_id,
      title: `Lien ${lien.lien_id} for ${lien.patient_name}`,
      subtitle,
      edgeCase: lien.lien_id === EDGE_LIEN_ID,
    };
  };

  const addNote = (lienId: string, text: string) => {
    const entry: LienNote = {
      note_id: `LN-live-${Date.now()}`,
      lien_id: lienId,
      author: PERSONA_NAME,
      timestamp: new Date(),
      note_text: text,
    };
    setNotes((prev) => [entry, ...prev]);
  };

  const approve = (item: ApprovalItem) => {
    const lien = liens.find((l) => l.lien_id === item.id);
    if (!lien) return;
    const writeOff = lien.requested_reduction ?? lien.lien_balance;
    setLiens((prev) =>
      prev.map((l) =>
        l.lien_id === item.id
          ? {
              ...l,
              requested_reduction: writeOff,
              lien_balance: 0,
              lien_status: "released",
              release_date: new Date(),
            }
          : l
      )
    );
    addNote(item.id, `Reduction of ${usd(writeOff)} approved and lien release sent to ${lien.attorney_firm}.`);
    logAction("Reduction approved and lien release sent to attorney", "approve-and-release");
  };

  const returnToDiscrepancies = (item: ApprovalItem) => {
    const lien = liens.find((l) => l.lien_id === item.id);
    setLiens((prev) =>
      prev.map((l) =>
        l.lien_id === item.id
          ? {
              ...l,
              lien_status: "discrepancy",
              discrepancy_reason:
                l.discrepancy_reason ?? "Returned from release review for another look",
            }
          : l
      )
    );
    setReturned((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
    if (lien) addNote(item.id, "Returned to discrepancies by Marcus for another look.");
    logAction("Lien returned to discrepancies", "return-to-discrepancies");
  };

  const writeOff = focus ? focus.requested_reduction ?? focus.lien_balance : 0;
  const clearsFloor = focus ? focus.payments_posted >= focus.reduction_floor : false;
  const daysToDisbursement =
    focus && focus.disbursement_deadline
      ? businessDaysBetween(new Date(), new Date(focus.disbursement_deadline))
      : null;

  return (
    <AppShell
      brandName={BRAND.name}
      brandUrl={BRAND.url}
      brandEmail={BRAND.email}
      personaName={PERSONA_NAME}
      personaRole={PERSONA_ROLE}
      nav={NAV}
    >
      <h1 className="text-2xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
        Release review
      </h1>
      <p className="mt-1 max-w-3xl text-sm text-[var(--pf-muted)]">
        Liens waiting for the coordinator's approval of any reduction and of the release letter.
        Nothing is written off and no release letter goes to a law firm until Marcus clicks approve.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg" style={{ fontFamily: "var(--pf-font-heading)" }}>
            Waiting on your approval
          </h2>
          <p className="mt-1 text-sm text-[var(--pf-muted)]">
            {focus
              ? `Lien ${focus.lien_id} is selected. Pick another lien below to review it instead.`
              : "No lien is waiting for release review."}
          </p>

          {focus && (
            <div className="mt-3">
              <ApprovalQueue
                items={[toItem(focus)]}
                primaryLabel="Approve and send release"
                secondaryLabel="Return to discrepancies"
                onPrimary={approve}
                onSecondary={returnToDiscrepancies}
                dataTour="approval-queue"
                primaryActionId="approve-and-release"
                secondaryActionId="return-to-discrepancies"
              />
            </div>
          )}

          {others.length > 0 && (
            <ul className="mt-4 space-y-2">
              {others.map((lien) => {
                const item = toItem(lien);
                return (
                  <li
                    key={lien.lien_id}
                    data-edge-case={lien.lien_id === EDGE_LIEN_ID ? "true" : undefined}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--pf-muted)]/15 p-3"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(lien.lien_id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block text-sm font-medium">{item.title}</span>
                      <span className="mt-0.5 block text-xs text-[var(--pf-muted)]">{item.subtitle}</span>
                      <span className="mt-1 block text-xs font-medium text-[var(--pf-primary)]">
                        Select this lien
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => returnToDiscrepancies(item)}
                      className="shrink-0 rounded-lg border border-[var(--pf-muted)]/30 px-3 py-1.5 text-sm"
                    >
                      Return to discrepancies
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg" style={{ fontFamily: "var(--pf-font-heading)" }}>
            What Marcus checks
          </h2>
          {focus ? (
            <>
              <DocumentViewer
                title={`Ledger for lien ${focus.lien_id}`}
                lines={[
                  `Patient ${focus.patient_name}`,
                  `Law firm ${focus.attorney_firm}`,
                  `Lien holder ${focus.lien_holder}`,
                  `Billed total ${usd(focus.billed_total)}`,
                  `Payments posted ${usd(focus.payments_posted)}${
                    focus.payment_posted_date ? ` on ${formatDate(new Date(focus.payment_posted_date))}` : ""
                  }`,
                  `Lien balance ${usd(focus.lien_balance)}`,
                  `Requested reduction ${focus.requested_reduction ? usd(focus.requested_reduction) : "None on file"}`,
                  `Disbursement ${
                    focus.disbursement_deadline
                      ? `${formatDate(new Date(focus.disbursement_deadline))}, ${
                          daysToDisbursement === null ? "no deadline set" : `${daysLabel(daysToDisbursement)} away`
                        }`
                      : "No deadline set"
                  }`,
                ]}
              />
              <div className="rounded-xl border border-[var(--pf-muted)]/20 p-4 text-sm">
                <p className="font-medium">Approved amount against the practice floor</p>
                <dl className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-[var(--pf-muted)]">Payment posted</dt>
                    <dd>{usd(focus.payments_posted)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--pf-muted)]">Amount to approve and write off</dt>
                    <dd>{usd(writeOff)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--pf-muted)]">Practice floor</dt>
                    <dd>
                      <Masked field="reduction_floor">{usd(focus.reduction_floor)}</Masked>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--pf-muted)]">Balance after release</dt>
                    <dd>{usd(0)}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-[var(--pf-muted)]">
                  {clearsFloor
                    ? "The payment posted clears the practice floor, so approving the reduction stays within policy."
                    : "The payment posted is below the practice floor. Marcus should send this back rather than approve it."}
                </p>
              </div>
              <DocumentViewer
                title="Release letter preview"
                lines={[
                  `To ${focus.attorney_firm}`,
                  `Patient ${focus.patient_name}, lien ${focus.lien_id}`,
                  `Billed total ${usd(focus.billed_total)}`,
                  `Reduction approved ${usd(writeOff)}`,
                  `Lien balance ${usd(focus.lien_balance)} released to ${usd(0)}`,
                  `Release date ${formatDate(new Date())}`,
                  "The practice releases its lien on this settlement once the coordinator approves it.",
                ]}
              />
            </>
          ) : (
            <p className="text-sm text-[var(--pf-muted)]">
              Every lien that was waiting has been approved or sent back.
            </p>
          )}
          <div>
            <h3 className="text-sm font-medium">Actions on this demo</h3>
            <div className="mt-2">
              <AuditLog />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
