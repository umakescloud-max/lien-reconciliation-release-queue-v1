import { useEffect, useState, type ReactNode, type SyntheticEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AppShell,
  DataTable,
  Masked,
  REFUSAL,
  RecordDrawer,
  SampleDocuments,
  ScenarioBanner,
  StatusPill,
  businessDaysBetween,
  formatDate,
  useActivity,
  useDemo,
  useDemoState,
  type StatusTone,
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
  stageLabel,
  statusLabel,
  usd,
  type Lien,
  type LienNote,
} from "../seed";

// The one sample this screen can read. The kit's drop zone knows every
// sample in the demo, so the screen blocks the other screen's document
// before the kit sees it.
const OWN_SAMPLE = "reduction-letter-5208";

function statusTone(status: Lien["lien_status"]): StatusTone {
  if (status === "discrepancy") return "accent";
  if (status === "release review") return "primary";
  return "muted";
}

function daysTo(deadline: Date | null): number | null {
  if (!deadline) return null;
  return businessDaysBetween(new Date(), new Date(deadline));
}

export default function Discrepancies() {
  const [liens, setLiens] = useDemoState<Lien[]>("liens", LIENS_SEED);
  const [notes, setNotes] = useDemoState<LienNote[]>("lienNotes", NOTES_SEED);
  const [sampleApplied, setSampleApplied] = useDemoState<Record<string, boolean>>(
    "discrepancies-sample-applied",
    {}
  );
  const { completed } = useDemo();
  const { logAction } = useActivity();
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const openId = params.get("lien");
  const setOpenId = (id: string | null) => setParams(id ? { lien: id } : {});

  const rows = liens.filter((l) => l.lien_status === "discrepancy");
  const selected = rows.find((l) => l.lien_id === openId) ?? null;

  // The banner and the countdown follow what is actually open, not a fixed
  // headline: once 5208 leaves this list the next most urgent lien takes over.
  const edgeLive = rows.find((l) => l.lien_id === EDGE_LIEN_ID) ?? null;
  const nextUrgent =
    rows
      .slice()
      .sort((a, b) => (daysTo(a.disbursement_deadline) ?? 999) - (daysTo(b.disbursement_deadline) ?? 999))[0] ??
    null;
  const headline = edgeLive ?? nextUrgent;
  const headlineDays = headline ? daysTo(headline.disbursement_deadline) : null;
  const edgeLien = liens.find((l) => l.lien_id === EDGE_LIEN_ID);

  const bannerTitle = edgeLive
    ? "Lien 5208: $6,200 paid on an $11,400 bill"
    : headline
      ? `Lien ${headline.lien_id}: ${headline.discrepancy_reason ?? "flagged for review"}`
      : edgeLien?.lien_status === "released"
        ? "Lien 5208 released"
        : "No open discrepancies";
  const bannerBody = edgeLive
    ? "The attorney asks for a release before disbursing, but no signed reduction agreement is on file. Nothing is written off and no release goes out until Marcus reviews it."
    : headline
      ? `${headline.attorney_firm} posted ${usd(headline.payments_posted)} against a ${usd(
          headline.billed_total
        )} bill. ${
          headlineDays === null
            ? "No disbursement deadline is set."
            : `${daysLabel(headlineDays)} left before the attorney disburses.`
        } It is fixed before any release goes out.`
      : edgeLien?.lien_status === "released"
        ? "Marcus approved the reduction and the release went to the firm. Nothing was written off without that approval."
        : "Every settled lien matches its payment and its closing statement.";

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

  const applyReductionLetter = (lien: Lien) => {
    const requested = lien.lien_balance;
    setLiens((prev) =>
      prev.map((l) =>
        l.lien_id === lien.lien_id
          ? {
              ...l,
              requested_reduction: requested,
              discrepancy_reason: "Reduction requested, within floor",
            }
          : l
      )
    );
    addNote(
      lien.lien_id,
      `Attorney's reduction letter attached. Reduction of ${usd(requested)} requested.`
    );
  };

  const attachLetter = () => {
    if (!selected) return;
    applyReductionLetter(selected);
    setSampleApplied((prev) => ({ ...prev, "attach-reduction-letter": true }));
    logAction("Reduction letter attached to lien 5208", "attach-reduction-letter");
  };

  // The sample document writes the same change as the button: reading the
  // attorney's letter is what lets the lien move, whichever way it arrived.
  useEffect(() => {
    if (!completed.has("attach-reduction-letter") || sampleApplied["attach-reduction-letter"]) return;
    const lien = liens.find((l) => l.lien_id === EDGE_LIEN_ID);
    if (!lien) return;
    applyReductionLetter(lien);
    setSampleApplied((prev) => ({ ...prev, "attach-reduction-letter": true }));
    logAction("Reduction letter attached to lien 5208", "attach-reduction-letter");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, sampleApplied, liens]);

  const moveToReleaseReview = () => {
    if (!selected) return;
    setLiens((prev) =>
      prev.map((l) =>
        l.lien_id === selected.lien_id ? { ...l, lien_status: "release review" } : l
      )
    );
    addNote(selected.lien_id, "Moved to release review for the coordinator's approval.");
    logAction("Lien moved to release review", "move-to-release-review");
    setOpenId(null);
  };

  const guardDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.toLowerCase() !== `${OWN_SAMPLE}.pdf`) {
      e.preventDefault();
      e.stopPropagation();
      setSampleError(REFUSAL);
    }
  };

  const guardPick = (e: SyntheticEvent<HTMLDivElement>) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase() !== `${OWN_SAMPLE}.pdf`) {
      e.stopPropagation();
      setSampleError(REFUSAL);
      target.value = "";
    } else {
      setSampleError(null);
    }
  };

  const drawerActions: ReactNode = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={attachLetter}
        data-action="attach-reduction-letter"
        className="rounded-lg border border-[var(--pf-muted)]/30 px-4 py-2 text-sm"
      >
        Attach reduction letter
      </button>
      <button
        type="button"
        onClick={moveToReleaseReview}
        data-action="move-to-release-review"
        className="rounded-lg bg-[var(--pf-primary)] px-4 py-2 text-sm font-medium text-[var(--pf-surface)]"
      >
        Move to release review
      </button>
    </div>
  );

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
        Discrepancies
      </h1>
      <p className="mt-1 max-w-3xl text-sm text-[var(--pf-muted)]">
        Settled liens whose payment, attorney, lien holder or closing statement does not match the
        ledger. Each one shows the reason and the days left before the attorney's disbursement
        deadline.
      </p>

      <div className="mt-5 space-y-4">
        <ScenarioBanner title={bannerTitle} body={bannerBody} />

        <div
          data-tour="appeal-countdown"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--pf-muted)]/20 p-4"
        >
          <div>
            <p className="text-sm font-medium">
              {headline ? `Lien ${headline.lien_id} disbursement deadline` : "Disbursement countdown"}
            </p>
            <p className="mt-1 text-xs text-[var(--pf-muted)]">
              {headline?.attorney_firm ?? "No lien is waiting on a deadline"}
              {headline?.disbursement_deadline
                ? ` — deadline ${formatDate(new Date(headline.disbursement_deadline))}`
                : ""}
            </p>
          </div>
          <p className="text-2xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
            {headlineDays === null ? "No deadline" : daysLabel(headlineDays)}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <DataTable
          columns={[
            {
              key: "lien_id",
              header: "Lien and patient",
              render: (row) => (
                <span>
                  <span className="font-medium">{row.patient_name}</span>
                  <span className="block text-xs text-[var(--pf-muted)]">Lien {row.lien_id}</span>
                  <span className="block text-xs text-[var(--pf-muted)]">{row.discrepancy_reason}</span>
                </span>
              ),
            },
            {
              key: "attorney_firm",
              header: "Law firm",
              render: (row) => row.attorney_firm,
            },
            {
              key: "lien_holder",
              header: "Lien holder",
              render: (row) => row.lien_holder,
            },
            {
              key: "case_stage",
              header: "Case stage",
              render: (row) => stageLabel(row.case_stage),
            },
            {
              key: "billed_total",
              header: "Billed",
              render: (row) => usd(row.billed_total),
            },
            {
              key: "payments_posted",
              header: "Payments",
              render: (row) => usd(row.payments_posted),
            },
            {
              key: "lien_balance",
              header: "Balance",
              render: (row) => usd(row.lien_balance),
            },
            {
              key: "lien_status",
              header: "Lien status",
              render: (row) => <StatusPill label={statusLabel(row.lien_status)} tone={statusTone(row.lien_status)} />,
            },
            {
              key: "deadline",
              header: "Disbursement",
              render: (row) => {
                const days = daysTo(row.disbursement_deadline);
                if (days === null) return <span className="text-[var(--pf-muted)]">No deadline</span>;
                return <span>{daysLabel(days)} left</span>;
              },
            },
          ]}
          rows={rows}
          rowKey={(row) => row.lien_id}
          onRowClick={(row) => setOpenId(row.lien_id)}
          dataTour="denial"
          mobileStatusKey="lien_status"
          mobileUrgencyKey="deadline"
          edgeCaseRow={(row) => row.lien_id === EDGE_LIEN_ID}
        />
      </div>

      <div className="mt-8" onDropCapture={guardDrop} onChangeCapture={guardPick}>
        <SampleDocuments screenId="discrepancies" />
        {sampleError && (
          <p role="alert" className="mt-2 text-sm text-[var(--pf-ink)]">
            {sampleError}
          </p>
        )}
      </div>

      <RecordDrawer
        open={selected !== null}
        title={selected ? `Lien ${selected.lien_id} — ${selected.patient_name}` : "Lien"}
        onClose={() => setOpenId(null)}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label={statusLabel(selected.lien_status)} tone={statusTone(selected.lien_status)} />
              <StatusPill label={stageLabel(selected.case_stage)} tone="muted" />
            </div>
            <p className="rounded-lg bg-[var(--pf-accent)] px-3 py-2 text-sm text-[var(--pf-ink)]">
              {selected.discrepancy_reason}
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-[var(--pf-muted)]">Law firm</dt><dd>{selected.attorney_firm}</dd></div>
              <div><dt className="text-[var(--pf-muted)]">Lien holder</dt><dd>{selected.lien_holder}</dd></div>
              <div><dt className="text-[var(--pf-muted)]">Billed total</dt><dd>{usd(selected.billed_total)}</dd></div>
              <div><dt className="text-[var(--pf-muted)]">Payments posted</dt><dd>{usd(selected.payments_posted)}</dd></div>
              <div><dt className="text-[var(--pf-muted)]">Lien balance</dt><dd>{usd(selected.lien_balance)}</dd></div>
              <div>
                <dt className="text-[var(--pf-muted)]">Requested reduction</dt>
                <dd>{selected.requested_reduction ? usd(selected.requested_reduction) : "None on file"}</dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Practice floor</dt>
                <dd><Masked field="reduction_floor">{usd(selected.reduction_floor)}</Masked></dd>
              </div>
              <div>
                <dt className="text-[var(--pf-muted)]">Disbursement</dt>
                <dd>
                  {selected.disbursement_deadline
                    ? daysLabel(daysTo(selected.disbursement_deadline) ?? 0)
                    : "None set"}
                </dd>
              </div>
            </dl>
            <div>
              <p className="text-sm font-medium">Treatment summary</p>
              <p className="mt-1 text-sm text-[var(--pf-muted)]"><Masked field="treatment_summary">{selected.treatment_summary}</Masked></p>
            </div>
            {drawerActions}
          </div>
        )}
      </RecordDrawer>
    </AppShell>
  );
}
