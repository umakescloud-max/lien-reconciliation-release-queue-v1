import { useEffect, useState, type ReactNode, type SyntheticEvent } from "react";
import {
  AppShell,
  DataTable,
  DocumentViewer,
  Masked,
  REFUSAL,
  RecordDrawer,
  SampleDocuments,
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
  LIENS_SEED,
  NOTES_SEED,
  PERSONA_NAME,
  STATEMENTS_SEED,
  PERSONA_ROLE,
  daysLabel,
  usd,
  type ClosingStatement,
  type Lien,
  type LienNote,
  type MatchStatus,
} from "../seed";

// The one sample this screen can read. The kit's drop zone knows every
// sample in the demo, so the screen blocks the other screen's document
// before the kit sees it.
const OWN_SAMPLE = "closing-statement-5163";

function matchTone(status: MatchStatus): StatusTone {
  if (status === "mismatch") return "accent";
  if (status === "matches") return "primary";
  return "muted";
}

function deadlineDays(statement: ClosingStatement): number | null {
  if (!statement.disbursement_deadline) return null;
  return businessDaysBetween(new Date(), new Date(statement.disbursement_deadline));
}

interface ComparisonProps {
  statement: ClosingStatement;
  lien: Lien;
  actions?: ReactNode;
  signedNote?: boolean;
}

function Comparison({ statement, lien, actions, signedNote }: ComparisonProps) {
  const resolvedAmount = statement.resolution_amount ?? lien.lien_balance;
  const difference = statement.statement_lien_amount - resolvedAmount;
  const flagged = statement.match_status === "mismatch";
  const days = deadlineDays(statement);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <DocumentViewer
          title="Firm's draft closing statement"
          lines={[
            `Gross settlement ${usd(statement.gross_settlement)}`,
            `Attorney fee ${usd(statement.attorney_fee)}`,
            `Case costs ${usd(statement.case_costs)}`,
            `Other liens ${usd(statement.other_liens_total)} (${statement.other_lien_types})`,
            `Amount listed for the practice ${usd(statement.statement_lien_amount)}`,
            `Net to client ${usd(statement.net_to_client)}`,
          ]}
        />
        <DocumentViewer
          title="Practice ledger and signed resolution"
          lines={[
            `Ledger balance ${usd(lien.lien_balance)}`,
            `Resolution status ${statement.resolution_status}`,
            `Signed resolution ${statement.resolution_amount ? usd(statement.resolution_amount) : "None on file"}`,
            `Proposal amount ${statement.proposal_amount ? usd(statement.proposal_amount) : "No proposal sent"}`,
          ]}
        />
      </div>
      <div className="rounded-xl border border-[var(--pf-muted)]/20 p-4 text-sm">
        <p className="font-medium">Practice reduction floor</p>
        <p className="mt-1 text-[var(--pf-muted)]">
          <Masked field="reduction_floor">{usd(lien.reduction_floor)}</Masked>
        </p>
      </div>
      {flagged ? (
        <div className="rounded-lg bg-[var(--pf-accent)] px-4 py-3 text-[var(--pf-ink)]">
          <p className="text-sm font-medium">
            Flagged to Discrepancies{days !== null ? `, ${daysLabel(days)} before disbursement` : ""}.
          </p>
        </div>
      ) : (
        difference !== 0 && (
          <div className="rounded-lg bg-[var(--pf-accent)] px-4 py-3 text-[var(--pf-ink)]">
            <p className="text-sm font-medium">
              {difference < 0
                ? `The statement is ${usd(Math.abs(difference))} below the signed resolution.`
                : `The statement is ${usd(difference)} above the signed resolution.`}
            </p>
            <p className="mt-1 text-sm">
              Flag it before the firm disburses, or record the signed resolution if it arrived.
            </p>
          </div>
        )
      )}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      {signedNote && (
        <p className="text-sm text-[var(--pf-muted)]">
          A signed lien resolution is on file, so the proposal and signature steps are closed for
          this statement.
        </p>
      )}
    </div>
  );
}

export default function Closing() {
  const [statements, setStatements] = useDemoState<ClosingStatement[]>("statements", STATEMENTS_SEED);
  const [liens, setLiens] = useDemoState<Lien[]>("liens", LIENS_SEED);
  const [notes, setNotes] = useDemoState<LienNote[]>("lienNotes", NOTES_SEED);
  const [sampleApplied, setSampleApplied] = useDemoState<Record<string, boolean>>(
    "closing-sample-applied",
    {}
  );
  const { completed } = useDemo();
  const { logAction } = useActivity();
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("5163");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const statement =
    statements.find((s) => s.lien_id === selectedId) ?? statements.find((s) => s.lien_id === "5163");
  if (!statement) return null;
  const lien = liens.find((l) => l.lien_id === statement.lien_id) ?? liens[0];

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

  const sendProposal = () => {
    if (statement.resolution_status !== "signed") {
      const netAfterFeeCosts = statement.gross_settlement - statement.attorney_fee - statement.case_costs;
      const totalLiens = lien.lien_balance + statement.other_liens_total;
      const share = totalLiens > 0 ? lien.lien_balance / totalLiens : 1;
      const proposal = Math.min(
        lien.lien_balance,
        Math.max(lien.reduction_floor, Math.round(netAfterFeeCosts * share))
      );
      setStatements((prev) =>
        prev.map((s) =>
          s.lien_id === statement.lien_id
            ? { ...s, proposal_amount: proposal, resolution_status: "proposal sent" }
            : s
        )
      );
      addNote(
        statement.lien_id,
        `Reduction proposal of ${usd(proposal)} sent to ${statement.attorney_firm} for signature.`
      );
    }
    logAction("Reduction proposal sent to attorney for signature", "send-reduction-proposal");
  };

  const recordSigned = () => {
    const resolution = statement.proposal_amount ?? statement.resolution_amount ?? lien.lien_balance;
    const matches = statement.statement_lien_amount === resolution;
    setStatements((prev) =>
      prev.map((s) =>
        s.lien_id === statement.lien_id
          ? {
              ...s,
              resolution_status: "signed",
              resolution_amount: resolution,
              resolution_signed_date: new Date(),
              match_status: matches ? "matches" : "mismatch",
            }
          : s
      )
    );
    addNote(statement.lien_id, `Signed lien resolution recorded at ${usd(resolution)}.`);
    logAction("Signed lien resolution recorded", "mark-resolution-signed");
  };

  const applyFlag = (flagged: ClosingStatement) => {
    setStatements((prev) =>
      prev.map((s) => (s.lien_id === flagged.lien_id ? { ...s, match_status: "mismatch" } : s))
    );
    setLiens((prev) =>
      prev.map((l) =>
        l.lien_id === flagged.lien_id
          ? {
              ...l,
              lien_status: "discrepancy",
              discrepancy_reason: "Closing statement lists less than signed resolution",
            }
          : l
      )
    );
    addNote(
      flagged.lien_id,
      `Closing statement flagged: lists ${usd(flagged.statement_lien_amount)} against a signed resolution of ${usd(
        flagged.resolution_amount ?? flagged.statement_lien_amount
      )}.`
    );
  };

  const flagMismatch = () => {
    applyFlag(statement);
    setSampleApplied((prev) => ({ ...prev, "flag-statement-mismatch": true }));
    logAction("Lien 5163 flagged: closing statement below signed resolution", "flag-statement-mismatch");
  };

  // The sample document does the same work as the button: the draft
  // statement for lien 5163 is read, the mismatch is flagged, and the lien
  // appears on Discrepancies — whether it was chosen or dropped in.
  useEffect(() => {
    if (!completed.has("flag-statement-mismatch") || sampleApplied["flag-statement-mismatch"]) return;
    const flagged = statements.find((s) => s.lien_id === "5163");
    if (!flagged) return;
    applyFlag(flagged);
    setSampleApplied((prev) => ({ ...prev, "flag-statement-mismatch": true }));
    logAction("Lien 5163 flagged: closing statement below signed resolution", "flag-statement-mismatch");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, sampleApplied, statements, liens]);

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

  const signed = statement.resolution_status === "signed";

  const actions = (
    <>
      <button
        type="button"
        onClick={sendProposal}
        data-action="send-reduction-proposal"
        disabled={signed}
        className="rounded-lg border border-[var(--pf-muted)]/30 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        Send reduction proposal
      </button>
      <button
        type="button"
        onClick={recordSigned}
        data-action="mark-resolution-signed"
        disabled={signed}
        className="rounded-lg border border-[var(--pf-muted)]/30 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        Record signed resolution
      </button>
      <button
        type="button"
        onClick={flagMismatch}
        data-action="flag-statement-mismatch"
        className="rounded-lg bg-[var(--pf-primary)] px-4 py-2 text-sm font-medium text-[var(--pf-surface)]"
      >
        Flag statement mismatch
      </button>
    </>
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
        Closing statements
      </h1>
      <p className="mt-1 max-w-3xl text-sm text-[var(--pf-muted)]">
        Every settled case whose firm has sent a draft final closing statement. Check the amount the
        firm lists for the practice against the ledger and the signed lien resolution before it
        disburses.
      </p>

      <div className="mt-6" data-tour="closing-table">
        <DataTable
          columns={[
            {
              key: "statement_id",
              header: "Statement and client",
              render: (row) => (
                <span>
                  <span className="font-medium">{row.patient_name}</span>
                  <span className="block text-xs text-[var(--pf-muted)]">{row.statement_id}</span>
                </span>
              ),
            },
            {
              key: "attorney_firm",
              header: "Law firm",
              render: (row) => row.attorney_firm,
            },
            {
              key: "gross_settlement",
              header: "Gross",
              render: (row) => usd(row.gross_settlement),
            },
            {
              key: "attorney_fee",
              header: "Fee",
              render: (row) => usd(row.attorney_fee),
            },
            {
              key: "case_costs",
              header: "Costs",
              render: (row) => usd(row.case_costs),
            },
            {
              key: "statement_lien_amount",
              header: "Listed for practice",
              render: (row) => usd(row.statement_lien_amount),
            },
            {
              key: "resolution_amount",
              header: "Signed resolution",
              render: (row) => (row.resolution_amount ? usd(row.resolution_amount) : "None"),
            },
            {
              key: "match_status",
              header: "Statement check",
              render: (row) => <StatusPill label={row.match_status} tone={matchTone(row.match_status)} />,
            },
            {
              key: "deadline",
              header: "Disbursement",
              render: (row) => {
                const days = deadlineDays(row);
                if (days === null) return <span className="text-[var(--pf-muted)]">No deadline</span>;
                return <span>{daysLabel(days)} left</span>;
              },
            },
          ]}
          rows={statements}
          rowKey={(row) => row.lien_id}
          onRowClick={(row) => {
            setSelectedId(row.lien_id);
            setDrawerOpen(true);
            logAction("Opened closing statement", "open-closing-statement");
          }}
          dataTour="closing"
          rowActionId="open-closing-statement"
          mobileStatusKey="match_status"
          mobileUrgencyKey="deadline"
        />
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg" style={{ fontFamily: "var(--pf-font-heading)" }}>
            Checking statement {statement.statement_id}
          </h2>
          <p className="text-sm text-[var(--pf-muted)]">
            {statement.resolution_signed_date
              ? `Resolution signed ${formatDate(new Date(statement.resolution_signed_date))}`
              : "No signed resolution on file"}
          </p>
        </div>
        <div className="mt-3">
          <Comparison
            statement={statement}
            lien={lien}
            actions={drawerOpen ? undefined : actions}
            signedNote={!drawerOpen && signed}
          />
        </div>
      </section>

      <div className="mt-8" onDropCapture={guardDrop} onChangeCapture={guardPick}>
        <SampleDocuments screenId="closing" />
        {sampleError && (
          <p role="alert" className="mt-2 text-sm text-[var(--pf-ink)]">
            {sampleError}
          </p>
        )}
      </div>

      <RecordDrawer
        open={drawerOpen}
        title={`Closing statement ${statement.statement_id}`}
        onClose={() => setDrawerOpen(false)}
      >
        <Comparison statement={statement} lien={lien} actions={actions} signedNote={signed} />
      </RecordDrawer>
    </AppShell>
  );
}
