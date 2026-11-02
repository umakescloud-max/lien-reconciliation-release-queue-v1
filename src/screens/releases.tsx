import {
  AppShell,
  ApprovalQueue,
  AuditLog,
  DocumentViewer,
  Masked,
  useActivity,
  useDemoState,
  type ApprovalItem,
} from "@kit";
import { LIENS_SEED, LIEN_NOTES, type Lien, type LienNote } from "../seed";
import { daysLabel, shellProps, usd } from "./shared";

export default function Releases() {
  const { logAction } = useActivity();
  const [liens, setLiens] = useDemoState<Lien[]>("liens", LIENS_SEED);
  const [notes, setNotes] = useDemoState<LienNote[]>("lien-notes", LIEN_NOTES);

  const rows = liens.filter((lien) => lien.lien_status === "release review");
  const focus = rows.find((lien) => lien.id === "5208") ?? rows[0];

  const items: ApprovalItem[] = rows.map((lien) => ({
    id: lien.id,
    title: `Lien ${lien.id} — ${lien.patient_name}`,
    subtitle: `${lien.attorney_firm}. ${usd(lien.lien_balance)} open, ${
      lien.requested_reduction === null
        ? "no reduction on file"
        : `${usd(lien.requested_reduction)} reduction requested`
    }.`,
    edgeCase: lien.id === "5208",
  }));

  const approve = (item: ApprovalItem) => {
    const lien = liens.find((row) => row.id === item.id);
    const now = new Date();
    setLiens((previous) =>
      previous.map((row) =>
        row.id === item.id
          ? { ...row, lien_balance: 0, lien_status: "released", release_date: now }
          : row,
      ),
    );
    setNotes((previous) => [
      ...previous,
      {
        id: `note-release-${item.id}-${now.getTime()}`,
        lien_id: item.id,
        author: "Marcus Odum",
        timestamp: now,
        note_text:
          lien && lien.requested_reduction !== null
            ? `Release approved with ${usd(lien.requested_reduction)} written off; release letter sent to ${lien.attorney_firm}.`
            : `Release approved; release letter sent to ${lien?.attorney_firm ?? "the referring firm"}.`,
      },
    ]);
    logAction("Reduction approved and lien release sent to attorney", "approve-and-release");
  };

  const returnToDiscrepancies = (item: ApprovalItem) => {
    const lien = liens.find((row) => row.id === item.id);
    const now = new Date();
    setLiens((previous) =>
      previous.map((row) =>
        row.id === item.id ? { ...row, lien_status: "discrepancy" } : row,
      ),
    );
    setNotes((previous) => [
      ...previous,
      {
        id: `note-return-${item.id}-${now.getTime()}`,
        lien_id: item.id,
        author: "Marcus Odum",
        timestamp: now,
        note_text: `Returned to discrepancies: the reduction was not approved for ${lien?.attorney_firm ?? "the referring firm"}.`,
      },
    ]);
    logAction("Lien returned to discrepancies", "return-to-discrepancies");
  };

  return (
    <AppShell {...shellProps}>
      <h1 className="text-2xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
        Release review
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--pf-muted)]">
        Liens waiting for the coordinator to approve any reduction and the release letter before it
        goes to the law firm. No balance is written off and no release letter leaves the practice
        until you approve it.
      </p>

      <div className="mt-6">
        <ApprovalQueue
          items={items}
          primaryLabel="Approve and send release"
          secondaryLabel="Return to discrepancies"
          onPrimary={approve}
          onSecondary={returnToDiscrepancies}
          dataTour="approval-queue"
          primaryActionId="approve-and-release"
          secondaryActionId="return-to-discrepancies"
        />
      </div>

      {focus ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-lg" style={{ fontFamily: "var(--pf-font-heading)" }}>
              Before you approve lien {focus.id}
            </h2>
            <div className="mt-3">
              <DocumentViewer
                title="Ledger and payment posted"
                lines={[
                  `Patient: ${focus.patient_name}`,
                  `Attorney: ${focus.attorney_firm}`,
                  `Lien holder: ${focus.lien_holder}`,
                  `Billed total: ${usd(focus.billed_total)}`,
                  `Payment posted: ${usd(focus.payments_posted)}`,
                  `Open balance: ${usd(focus.lien_balance)}`,
                  `Requested reduction: ${
                    focus.requested_reduction === null
                      ? "None on file"
                      : usd(focus.requested_reduction)
                  }`,
                  `Disbursement deadline: ${daysLabel(focus.disbursement_deadline)}`,
                ]}
              />
            </div>
            <dl className="mt-3 grid gap-2 rounded-xl border border-[var(--pf-muted)]/20 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--pf-muted)]">Reduction floor</dt>
                <dd>
                  <Masked field="reduction_floor">{usd(focus.reduction_floor)}</Masked>
                </dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Payment posted</dt>
                <dd>
                  {focus.payment_posted_date
                    ? focus.payment_posted_date.toLocaleDateString()
                    : "No payment posted"}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="text-lg" style={{ fontFamily: "var(--pf-font-heading)" }}>
              Actions on this queue
            </h2>
            <div className="mt-3">
              <AuditLog />
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-[var(--pf-muted)]">
          No liens are waiting on release review right now.
        </p>
      )}
    </AppShell>
  );
}
