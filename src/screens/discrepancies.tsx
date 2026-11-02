import { useEffect, useRef, useState } from "react";
import {
  AppShell,
  DataTable,
  Masked,
  SampleDocuments,
  ScenarioBanner,
  StatusPill,
  useActivity,
  useDemo,
  useDemoState,
  type DataTableColumn,
} from "@kit";
import { LIENS_SEED, LIEN_NOTES, type Lien, type LienNote } from "../seed";
import {
  caseStageLabel,
  caseStageTone,
  daysLabel,
  lienStatusLabel,
  lienStatusTone,
  shellProps,
  usd,
} from "./shared";

const EDGE_ID = "5208";
const EDGE_LABEL = "Payment short of balance, no reduction on file";

export default function Discrepancies() {
  const { logAction } = useActivity();
  const { completed } = useDemo();
  const [liens, setLiens] = useDemoState<Lien[]>("liens", LIENS_SEED);
  const [notes, setNotes] = useDemoState<LienNote[]>("lien-notes", LIEN_NOTES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement | null>(null);

  // The detail panel opens inline, above the table, so it never covers the
  // table the visitor is working in. Bring it into view when it opens.
  useEffect(() => {
    if (selectedId && detailRef.current) {
      detailRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [selectedId]);

  // Using the sample document completes the same action as the attach button.
  // Keep the ledger consistent with the sample's stated result in that path too.
  useEffect(() => {
    if (!completed.has("attach-reduction-letter")) return;
    setLiens((previous) => {
      let changed = false;
      const next = previous.map((row) => {
        if (row.id !== EDGE_ID || row.discrepancy_reason === "Reduction requested, within floor") {
          return row;
        }
        changed = true;
        return {
          ...row,
          requested_reduction: row.lien_balance,
          discrepancy_reason: "Reduction requested, within floor",
        };
      });
      return changed ? next : previous;
    });
  }, [completed, setLiens]);

  const rows = liens.filter((lien) => lien.lien_status === "discrepancy");
  const bannerLien = rows.find((lien) => lien.id === EDGE_ID) ?? rows[0];
  const selected = selectedId
    ? liens.find((lien) => lien.id === selectedId) ?? null
    : null;

  const columns: DataTableColumn<Lien>[] = [
    {
      key: "id",
      header: "Lien",
      render: (lien) => (
        <div>
          <p className="font-medium">Lien {lien.id}</p>
          <p className="text-xs text-[var(--pf-muted)]">{lien.patient_name}</p>
        </div>
      ),
    },
    {
      key: "attorney_firm",
      header: "Referring firm",
      render: (lien) => lien.attorney_firm,
    },
    {
      key: "lien_holder",
      header: "Lien holder",
      render: (lien) => lien.lien_holder,
    },
    {
      key: "discrepancy_reason",
      header: "Reason",
      render: (lien) => lien.discrepancy_reason,
    },
    {
      key: "billed_total",
      header: "Billed",
      render: (lien) => usd(lien.billed_total),
    },
    {
      key: "payments_posted",
      header: "Payments posted",
      render: (lien) => usd(lien.payments_posted),
    },
    {
      key: "lien_balance",
      header: "Balance",
      render: (lien) => usd(lien.lien_balance),
    },
    {
      key: "lien_status",
      header: "Lien status",
      render: (lien) => (
        <StatusPill label={lienStatusLabel(lien.lien_status)} tone={lienStatusTone(lien.lien_status)} />
      ),
    },
    {
      key: "days_left",
      header: "Disbursement",
      render: (lien) => daysLabel(lien.disbursement_deadline),
    },
  ];

  const attachLetter = () => {
    if (!selected) return;
    const reduction = selected.lien_balance;
    setLiens((previous) =>
      previous.map((row) =>
        row.id === selected.id
          ? {
              ...row,
              requested_reduction: reduction,
              discrepancy_reason: "Reduction requested, within floor",
            }
          : row,
      ),
    );
    const now = new Date();
    setNotes((previous) => [
      ...previous,
      {
        id: `note-attach-${selected.id}-${now.getTime()}`,
        lien_id: selected.id,
        author: "Marcus Odum",
        timestamp: now,
        note_text: `Reduction letter attached for ${usd(reduction)}; the offer is above the practice floor.`,
      },
    ]);
    logAction("Reduction letter attached to lien 5208", "attach-reduction-letter");
  };

  const moveToReleaseReview = () => {
    if (!selected) return;
    setLiens((previous) =>
      previous.map((row) =>
        row.id === selected.id ? { ...row, lien_status: "release review" } : row,
      ),
    );
    const now = new Date();
    setNotes((previous) => [
      ...previous,
      {
        id: `note-review-${selected.id}-${now.getTime()}`,
        lien_id: selected.id,
        author: "Marcus Odum",
        timestamp: now,
        note_text: "Moved to release review for approval.",
      },
    ]);
    logAction("Lien moved to release review", "move-to-release-review");
    setSelectedId(null);
  };

  return (
    <AppShell {...shellProps}>
      <h1 className="text-2xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
        Discrepancies
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--pf-muted)]">
        Settled liens whose payment, attorney or lien holder does not match the ledger, with the
        days left before the attorney's disbursement deadline.
      </p>

      {bannerLien && (
        <div className="mt-6">
          <ScenarioBanner
            dataTour="appeal-countdown"
            title={bannerLien.discrepancy_reason || EDGE_LABEL}
            body={`${bannerLien.patient_name} at ${bannerLien.attorney_firm}: ${usd(
              bannerLien.payments_posted,
            )} posted against ${usd(bannerLien.billed_total)}, leaving ${usd(
              bannerLien.lien_balance,
            )} open. ${daysLabel(bannerLien.disbursement_deadline)} before the attorney's disbursement deadline.`}
          />
        </div>
      )}

      <div className="mt-6">
        <SampleDocuments screenId="discrepancies" />
      </div>

      {selected && (
        <section
          ref={detailRef}
          aria-labelledby="lien-detail-heading"
          className="mt-6 rounded-2xl border border-[var(--pf-primary)]/30 bg-[var(--pf-surface)] p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2
              id="lien-detail-heading"
              className="text-lg"
              style={{ fontFamily: "var(--pf-font-heading)" }}
            >
              Lien {selected.id} — {selected.patient_name}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="rounded-lg border border-[var(--pf-muted)]/30 px-3 py-1.5 text-sm text-[var(--pf-muted)]"
            >
              Close
            </button>
          </div>

          <div className="mt-4 space-y-4 text-sm">
            <p className="rounded-lg bg-[var(--pf-accent)] px-3 py-2 text-[var(--pf-ink)]">
              {selected.discrepancy_reason || EDGE_LABEL}
            </p>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-[var(--pf-muted)]">Referring firm</dt>
                <dd>{selected.attorney_firm}</dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Lien holder</dt>
                <dd>{selected.lien_holder}</dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Case stage</dt>
                <dd>
                  <StatusPill
                    label={caseStageLabel(selected.case_stage)}
                    tone={caseStageTone(selected.case_stage)}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Lien status</dt>
                <dd>
                  <StatusPill
                    label={lienStatusLabel(selected.lien_status)}
                    tone={lienStatusTone(selected.lien_status)}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Billed total</dt>
                <dd>{usd(selected.billed_total)}</dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Payments posted</dt>
                <dd>{usd(selected.payments_posted)}</dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Open balance</dt>
                <dd>{usd(selected.lien_balance)}</dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Requested reduction</dt>
                <dd>
                  {selected.requested_reduction === null
                    ? "None on file"
                    : usd(selected.requested_reduction)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Reduction floor</dt>
                <dd>
                  <Masked field="reduction_floor">{usd(selected.reduction_floor)}</Masked>
                </dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Settlement reported</dt>
                <dd>
                  {selected.settlement_amount_reported === null
                    ? "Not yet reported"
                    : usd(selected.settlement_amount_reported)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Payment posted</dt>
                <dd>
                  {selected.payment_posted_date
                    ? selected.payment_posted_date.toLocaleDateString()
                    : "No payment posted"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Disbursement deadline</dt>
                <dd>{daysLabel(selected.disbursement_deadline)}</dd>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-[var(--pf-muted)]">Treatment summary</dt>
                <dd>
                  <Masked field="treatment_summary">{selected.treatment_summary}</Masked>
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2 border-t border-[var(--pf-muted)]/20 pt-4">
              <button
                type="button"
                data-action="attach-reduction-letter"
                onClick={attachLetter}
                className="rounded-lg border border-[var(--pf-primary)] px-3 py-1.5 text-sm font-medium text-[var(--pf-primary)]"
              >
                Attach reduction letter
              </button>
              <button
                type="button"
                data-action="move-to-release-review"
                onClick={moveToReleaseReview}
                className="rounded-lg bg-[var(--pf-primary)] px-3 py-1.5 text-sm font-medium text-[var(--pf-surface)]"
              >
                Move to release review
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(lien) => lien.id}
          dataTour="denial"
          mobileStatusKey="lien_status"
          mobileUrgencyKey="days_left"
          edgeCaseRow={(lien) => lien.id === EDGE_ID}
          onRowClick={(lien) => setSelectedId(lien.id)}
        />
      </div>
    </AppShell>
  );
}
