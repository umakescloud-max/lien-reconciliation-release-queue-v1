import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppShell,
  DataTable,
  MetricPanel,
  StatusPill,
  useActivity,
  useDemoState,
  type DataTableColumn,
  type StatTileProps,
} from "@kit";
import { LIENS_SEED, type Lien } from "../seed";
import {
  caseStageLabel,
  caseStageTone,
  daysLabel,
  daysUntil,
  lienStatusLabel,
  lienStatusTone,
  shellProps,
  usd,
  usdCompact,
} from "./shared";

export default function Liens() {
  const navigate = useNavigate();
  const { logAction } = useActivity();
  const [liens] = useDemoState<Lien[]>("liens", LIENS_SEED);
  const [settledOnly, setSettledOnly] = useState(false);

  const metrics: StatTileProps[] = useMemo(() => {
    const open = liens.filter((lien) => lien.lien_status !== "released");
    const openBalance = open.reduce((sum, lien) => sum + lien.lien_balance, 0);

    const dueSoon = liens.filter((lien) => {
      if (lien.lien_status !== "discrepancy") return false;
      const days = daysUntil(lien.disbursement_deadline);
      return days !== null && days >= 0 && days <= 5;
    }).length;

    const waiting = liens.filter((lien) => lien.lien_status === "release review").length;

    const released = liens.filter(
      (lien) => lien.lien_status === "released" && lien.release_date && lien.payment_posted_date,
    );
    const averageDays =
      released.length === 0
        ? 0
        : released.reduce((sum, lien) => {
            const paid = (lien.payment_posted_date as Date).getTime();
            const out = (lien.release_date as Date).getTime();
            return sum + (out - paid) / 86_400_000;
          }, 0) / released.length;

    return [
      {
        label: "Open lien balance",
        value: usdCompact(openBalance),
        hint: `${usd(openBalance)} across liens not yet released`,
      },
      {
        label: "Discrepancies due in 5 days",
        value: String(dueSoon),
        hint: "Settled liens with a disbursement deadline this week",
      },
      {
        label: "Releases waiting on approval",
        value: String(waiting),
        hint: "In the release review queue",
      },
      {
        label: "Average days from payment to release",
        value: `${averageDays.toFixed(1)} days`,
        hint: "Across every released lien",
      },
    ];
  }, [liens]);

  const rows = settledOnly
    ? liens.filter((lien) => lien.case_stage === "settled" || lien.case_stage === "paid")
    : liens;

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
      key: "case_stage",
      header: "Case stage",
      render: (lien) => (
        <StatusPill label={caseStageLabel(lien.case_stage)} tone={caseStageTone(lien.case_stage)} />
      ),
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
      key: "treatment_summary",
      header: "Treatment",
      render: (lien) => lien.treatment_summary,
    },
    {
      key: "days_left",
      header: "Disbursement",
      render: (lien) => daysLabel(lien.disbursement_deadline),
    },
  ];

  return (
    <AppShell {...shellProps}>
      <h1 className="text-2xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
        Liens
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--pf-muted)]">
        Every open lien and every recent release, with settled accounts first. Click a row to open
        the ledger and history.
      </p>

      <div className="mt-6">
        <MetricPanel metrics={metrics} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-action="filter-by-stage"
          onClick={() => {
            setSettledOnly(true);
            logAction("Showing settled liens only", "filter-by-stage");
          }}
          className="rounded-lg border border-[var(--pf-muted)]/30 px-3 py-1.5 text-sm"
        >
          Show settled only
        </button>
        {settledOnly && (
          <button
            type="button"
            onClick={() => setSettledOnly(false)}
            className="text-sm text-[var(--pf-muted)] underline"
          >
            Show all liens
          </button>
        )}
        <span className="text-sm text-[var(--pf-muted)]">
          {rows.length} lien{rows.length === 1 ? "" : "s"} shown
        </span>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(lien) => lien.id}
          dataTour="tracker-table"
          mobileStatusKey="lien_status"
          mobileUrgencyKey="days_left"
          rowActionId="open-lien"
          onRowClick={(lien) => {
            logAction("Opened lien ledger", "open-lien");
            navigate(`/lien-case?case=${lien.id}`);
          }}
        />
      </div>
    </AppShell>
  );
}
