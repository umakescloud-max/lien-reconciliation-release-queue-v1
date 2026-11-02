import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AppShell,
  AuditLog,
  DocumentViewer,
  Masked,
  StatusPill,
  Timeline,
  formatDateTime,
  useActivity,
  useDemoState,
  type TimelineEntry,
} from "@kit";
import { LIENS_SEED, LIEN_NOTES, type Lien, type LienNote } from "../seed";
import {
  caseStageLabel,
  caseStageTone,
  daysLabel,
  lienStatusLabel,
  lienStatusTone,
  paymentPayer,
  shellProps,
  usd,
} from "./shared";

export default function LienCase() {
  const [params] = useSearchParams();
  const caseId = params.get("case") ?? "5208";
  const { logAction } = useActivity();
  const [liens, setLiens] = useDemoState<Lien[]>("liens", LIENS_SEED);
  const [notes, setNotes] = useDemoState<LienNote[]>("lien-notes", LIEN_NOTES);

  const lien = liens.find((row) => row.id === caseId) ?? liens[0];

  const entries: TimelineEntry[] = useMemo(() => {
    const items: { at: Date; entry: TimelineEntry }[] = [];
    const lienNotes = notes.filter((note) => note.lien_id === lien.id);

    for (const note of lienNotes) {
      const at = new Date(note.timestamp);
      items.push({
        at,
        entry: {
          id: note.id,
          timestamp: formatDateTime(at),
          author: note.author,
          text: note.note_text,
        },
      });
    }

    const billedAt = new Date(lien.date_of_injury);
    billedAt.setDate(billedAt.getDate() + 30);
    billedAt.setHours(13, 0, 0, 0);
    items.push({
      at: billedAt,
      entry: {
        id: `case-billed-${lien.id}`,
        timestamp: formatDateTime(billedAt),
        author: "Renata Ilves",
        text: "Services billed: itemized charges posted to the ledger.",
      },
    });

    if (
      lien.payment_posted_date &&
      !lienNotes.some((note) => note.note_text.startsWith("Payment posted"))
    ) {
      const at = new Date(lien.payment_posted_date);
      items.push({
        at,
        entry: {
          id: `case-payment-${lien.id}`,
          timestamp: formatDateTime(at),
          author: "Joaquin Reyes",
          text: `Payment posted: ${usd(lien.payments_posted)} from ${paymentPayer(lien)}.`,
        },
      });
    }

    if (lien.release_date) {
      const at = new Date(lien.release_date);
      items.push({
        at,
        entry: {
          id: `case-release-${lien.id}`,
          timestamp: formatDateTime(at),
          author: "Marcus Odum",
          text: `Lien release sent to ${lien.attorney_firm}.`,
        },
      });
    }

    items.sort((a, b) => a.at.getTime() - b.at.getTime());
    return items.map((item) => item.entry);
  }, [lien, notes]);

  const addNote = () => {
    const now = new Date();
    setNotes((previous) => [
      ...previous,
      {
        id: `note-added-${lien.id}-${now.getTime()}`,
        lien_id: lien.id,
        author: "Marcus Odum",
        timestamp: now,
        note_text: "Note added from the lien desk.",
      },
    ]);
    logAction("Note added to the lien", "add-lien-note");
  };

  const sendBalance = () => {
    const now = new Date();
    setLiens((previous) =>
      previous.map((row) =>
        row.id === lien.id ? { ...row, last_attorney_contact: now } : row,
      ),
    );
    setNotes((previous) => [
      ...previous,
      {
        id: `note-sent-${lien.id}-${now.getTime()}`,
        lien_id: lien.id,
        author: "Marcus Odum",
        timestamp: now,
        note_text: `Itemized balance of ${usd(lien.lien_balance)} sent to ${lien.attorney_firm}.`,
      },
    ]);
    logAction("Itemized lien balance sent to attorney", "send-itemized-balance");
  };

  return (
    <AppShell {...shellProps}>
      <p className="text-sm text-[var(--pf-muted)]">{lien.patient_name}</p>
      <h1 className="mt-1 text-2xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
        Lien {lien.id} ledger
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--pf-muted)]">
        <StatusPill label={lienStatusLabel(lien.lien_status)} tone={lienStatusTone(lien.lien_status)} />
        <StatusPill label={caseStageLabel(lien.case_stage)} tone={caseStageTone(lien.case_stage)} />
        <span>{lien.attorney_firm}</span>
        <span>{lien.lien_holder}</span>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg" style={{ fontFamily: "var(--pf-font-heading)" }}>
              Lien history
            </h2>
            <button
              type="button"
              data-action="add-lien-note"
              onClick={addNote}
              className="rounded-lg border border-[var(--pf-muted)]/30 px-3 py-1.5 text-sm"
            >
              Add note
            </button>
          </div>
          <div className="mt-4">
            <Timeline entries={entries} dataTour="case-timeline" />
          </div>
        </section>

        <aside className="space-y-4">
          <DocumentViewer
            title="Itemized ledger"
            lines={[
              `Billed total: ${usd(lien.billed_total)}`,
              `Payments posted: ${usd(lien.payments_posted)}`,
              `Open balance: ${usd(lien.lien_balance)}`,
              `Requested reduction: ${
                lien.requested_reduction === null
                  ? "None on file"
                  : usd(lien.requested_reduction)
              }`,
              `Settlement reported: ${
                lien.settlement_amount_reported === null
                  ? "Not yet reported"
                  : usd(lien.settlement_amount_reported)
              }`,
            ]}
          />

          <DocumentViewer
            title="Treatment summary"
            field="treatment_summary"
            lines={[lien.treatment_summary]}
          />

          <div className="rounded-xl border border-[var(--pf-muted)]/20 p-4">
            <h2 className="text-sm font-medium">Lien details</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--pf-muted)]">Attorney contact</dt>
                <dd>{lien.attorney_contact}</dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Date of injury</dt>
                <dd>{lien.date_of_injury.toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Injury</dt>
                <dd>{lien.injury_type}</dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Payment posted</dt>
                <dd>
                  {lien.payment_posted_date
                    ? lien.payment_posted_date.toLocaleDateString()
                    : "No payment posted"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Disbursement deadline</dt>
                <dd>{daysLabel(lien.disbursement_deadline)}</dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Reduction floor</dt>
                <dd>
                  <Masked field="reduction_floor">{usd(lien.reduction_floor)}</Masked>
                </dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Last attorney contact</dt>
                <dd>{lien.last_attorney_contact.toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Discrepancy reason</dt>
                <dd>{lien.discrepancy_reason || "None on file"}</dd>
              </div>
            </dl>
            <button
              type="button"
              data-action="send-itemized-balance"
              onClick={sendBalance}
              className="mt-4 rounded-lg bg-[var(--pf-primary)] px-3 py-1.5 text-sm font-medium text-[var(--pf-surface)]"
            >
              Send itemized balance to attorney
            </button>
          </div>

          <div>
            <h2 className="text-sm font-medium">Actions on this lien</h2>
            <div className="mt-2">
              <AuditLog />
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
