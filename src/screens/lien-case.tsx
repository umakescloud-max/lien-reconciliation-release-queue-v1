import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AppShell,
  AuditLog,
  DocumentViewer,
  Masked,
  StatusPill,
  Timeline,
  businessDaysBetween,
  formatDate,
  formatDateTime,
  useActivity,
  useDemoState,
} from "@kit";
import { NAV } from "../nav";
import {
  BRAND,
  EDGE_LIEN_ID,
  LIENS_SEED,
  NOTES_SEED,
  PERSONA_NAME,
  PERSONA_ROLE,
  SERVICE_LINES_SEED,
  daysLabel,
  stageLabel,
  statusLabel,
  usd,
  type Lien,
  type LienNote,
} from "../seed";

// Timeline dates carry the year, so a lien's history reads unambiguously.
function timelineStamp(value: Date): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LienCase() {
  const [params] = useSearchParams();
  const requestedId = params.get("case") ?? EDGE_LIEN_ID;
  const [liens, setLiens] = useDemoState<Lien[]>("liens", LIENS_SEED);
  const [notes, setNotes] = useDemoState<LienNote[]>("lienNotes", NOTES_SEED);
  const { logAction } = useActivity();
  const [noteText, setNoteText] = useState("");

  const lien = liens.find((l) => l.lien_id === requestedId) ?? liens.find((l) => l.lien_id === EDGE_LIEN_ID);
  if (!lien) return null;

  const deadlineDays = lien.disbursement_deadline
    ? businessDaysBetween(new Date(), new Date(lien.disbursement_deadline))
    : null;

  const entries = notes
    .filter((n) => n.lien_id === lien.lien_id)
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((n) => ({
      id: n.note_id,
      timestamp: timelineStamp(n.timestamp),
      author: n.author,
      text: n.note_text,
    }));

  const serviceLines = SERVICE_LINES_SEED[lien.lien_id] ?? [];

  const addNote = () => {
    const text =
      noteText.trim() || `Note added from the lien desk at ${formatDateTime(new Date())}.`;
    const entry: LienNote = {
      note_id: `LN-live-${Date.now()}`,
      lien_id: lien.lien_id,
      author: PERSONA_NAME,
      timestamp: new Date(),
      note_text: text,
    };
    setNotes((prev) => [entry, ...prev]);
    setNoteText("");
    logAction("Note added to the lien", "add-lien-note");
  };

  const sendItemizedBalance = () => {
    const now = new Date();
    const entry: LienNote = {
      note_id: `LN-live-${Date.now()}`,
      lien_id: lien.lien_id,
      author: PERSONA_NAME,
      timestamp: now,
      note_text: `Itemized balance of ${usd(lien.lien_balance)} sent to ${lien.attorney_firm}.`,
    };
    setNotes((prev) => [entry, ...prev]);
    setLiens((prev) =>
      prev.map((l) => (l.lien_id === lien.lien_id ? { ...l, last_attorney_contact: now } : l))
    );
    logAction("Itemized lien balance sent to attorney", "send-itemized-balance");
  };

  return (
    <AppShell
      brandName={BRAND.name}
      brandUrl={BRAND.url}
      brandEmail={BRAND.email}
      personaName={PERSONA_NAME}
      personaRole={PERSONA_ROLE}
      nav={NAV}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--pf-muted)]">Lien {lien.lien_id}</p>
          <h1 className="text-2xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
            {lien.patient_name}
          </h1>
          <p className="mt-1 text-sm text-[var(--pf-muted)]">
            {lien.attorney_firm} — {lien.attorney_contact}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label={statusLabel(lien.lien_status)} tone={lien.lien_status === "discrepancy" ? "accent" : "primary"} />
          <StatusPill label={stageLabel(lien.case_stage)} tone="muted" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--pf-muted)]/20 p-4">
          <p className="text-xs text-[var(--pf-muted)]">Billed total</p>
          <p className="mt-1 text-xl" style={{ fontFamily: "var(--pf-font-heading)" }}>{usd(lien.billed_total)}</p>
        </div>
        <div className="rounded-xl border border-[var(--pf-muted)]/20 p-4">
          <p className="text-xs text-[var(--pf-muted)]">Payments posted</p>
          <p className="mt-1 text-xl" style={{ fontFamily: "var(--pf-font-heading)" }}>{usd(lien.payments_posted)}</p>
          <p className="mt-1 text-xs text-[var(--pf-muted)]">
            {lien.payment_posted_date ? `Posted ${formatDate(new Date(lien.payment_posted_date))}` : "No payment posted"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--pf-muted)]/20 p-4">
          <p className="text-xs text-[var(--pf-muted)]">Lien balance</p>
          <p className="mt-1 text-xl" style={{ fontFamily: "var(--pf-font-heading)" }}>{usd(lien.lien_balance)}</p>
        </div>
        <div className="rounded-xl border border-[var(--pf-muted)]/20 p-4">
          <p className="text-xs text-[var(--pf-muted)]">
            {lien.lien_status === "released" ? "Release" : "Disbursement"}
          </p>
          {lien.lien_status === "released" ? (
            <>
              <p className="mt-1 text-xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
                Released {lien.release_date ? formatDate(new Date(lien.release_date)) : ""}
              </p>
              <p className="mt-1 text-xs text-[var(--pf-muted)]">Release letter sent to the firm</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
                {deadlineDays === null
                  ? "None set"
                  : deadlineDays >= 0
                    ? daysLabel(deadlineDays)
                    : `${Math.abs(deadlineDays)} days past`}
              </p>
              <p className="mt-1 text-xs text-[var(--pf-muted)]">
                {lien.disbursement_deadline ? `Deadline ${formatDate(new Date(lien.disbursement_deadline))}` : "No attorney deadline"}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg" style={{ fontFamily: "var(--pf-font-heading)" }}>Itemized ledger</h2>
          <DocumentViewer
            title="Services billed"
            lines={[
              ...serviceLines.map(
                (line) =>
                  `${new Date(line.service_date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}: ${line.label} (${line.code}) ${usd(line.amount)}`
              ),
              `Billed total ${usd(lien.billed_total)}`,
              `Payments posted ${usd(lien.payments_posted)}`,
              `Lien balance ${usd(lien.lien_balance)}`,
              `Settlement reported ${lien.settlement_amount_reported ? usd(lien.settlement_amount_reported) : "Not reported"}`,
            ]}
          />
          <DocumentViewer
            title="Practice reduction floor"
            field="reduction_floor"
            lines={[`Lowest total the practice will accept: ${usd(lien.reduction_floor)}`]}
          />
          <div className="rounded-xl border border-[var(--pf-muted)]/20 p-4 text-sm">
            <p className="font-medium">Treatment summary</p>
            <p className="mt-1 text-[var(--pf-muted)]">
              <Masked field="treatment_summary">{lien.treatment_summary}</Masked>
            </p>
          </div>
          {lien.discrepancy_reason && (
            <div className="rounded-lg bg-[var(--pf-accent)] px-4 py-3 text-[var(--pf-ink)]">
              <p className="text-sm font-medium">Flagged for review</p>
              <p className="mt-1 text-sm">{lien.discrepancy_reason}</p>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg" style={{ fontFamily: "var(--pf-font-heading)" }}>Lien history</h2>
          <div className="mt-4">
            <Timeline entries={entries} dataTour="case-timeline" />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block min-w-0 flex-1">
          <span className="text-sm font-medium">Add a note</span>
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="What happened on this lien?"
            className="mt-1 w-full rounded-lg border border-[var(--pf-muted)]/30 bg-[var(--pf-surface)] px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={addNote}
          data-action="add-lien-note"
          className="rounded-lg bg-[var(--pf-primary)] px-4 py-2 text-sm font-medium text-[var(--pf-surface)]"
        >
          Add note
        </button>
        <button
          type="button"
          onClick={sendItemizedBalance}
          data-action="send-itemized-balance"
          className="rounded-lg border border-[var(--pf-muted)]/30 px-4 py-2 text-sm"
        >
          Send itemized balance to attorney
        </button>
      </div>

      <section className="mt-8">
        <h2 className="text-lg" style={{ fontFamily: "var(--pf-font-heading)" }}>Actions on this demo</h2>
        <div className="mt-3">
          <AuditLog />
        </div>
      </section>
    </AppShell>
  );
}
