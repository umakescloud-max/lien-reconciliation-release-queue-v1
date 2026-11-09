import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppShell,
  DataTable,
  MetricPanel,
  StatusPill,
  businessDaysBetween,
  formatDate,
  useActivity,
  useDemoState,
  type StatTileProps,
  type StatusTone,
} from "@kit";
import { NAV } from "../nav";
import {
  BRAND,
  LIENS_SEED,
  PERSONA_NAME,
  PERSONA_ROLE,
  daysLabel,
  stageLabel,
  statusLabel,
  usd,
  usdCompact,
  type CaseStage,
  type Lien,
  type LienStatus,
} from "../seed";

const STAGE_ORDER: Record<CaseStage, number> = {
  settled: 0,
  paid: 0,
  "in litigation": 1,
  "demand sent": 2,
  treating: 3,
};

function statusTone(status: LienStatus): StatusTone {
  if (status === "discrepancy") return "accent";
  if (status === "release review") return "primary";
  if (status === "released") return "primary";
  return "muted";
}

function daysToDeadline(lien: Lien): number | null {
  if (!lien.disbursement_deadline) return null;
  return businessDaysBetween(new Date(), new Date(lien.disbursement_deadline));
}

export default function Liens() {
  const [liens] = useDemoState<Lien[]>("liens", LIENS_SEED);
  const [settledOnly, setSettledOnly] = useState(false);
  const navigate = useNavigate();
  const { logAction } = useActivity();

  const metrics = useMemo<StatTileProps[]>(() => {
    const open = liens.filter((l) => l.lien_status !== "released");
    const openBalance = open.reduce((sum, l) => sum + l.lien_balance, 0);
    const dueInFive = liens.filter((l) => {
      if (l.lien_status !== "discrepancy") return false;
      const days = daysToDeadline(l);
      return days !== null && days >= 0 && days <= 5;
    }).length;
    const waiting = liens.filter((l) => l.lien_status === "release review").length;
    const released = liens.filter(
      (l) => l.lien_status === "released" && l.release_date && l.payment_posted_date
    );
    const avgDays = released.length
      ? Math.round(
          released.reduce(
            (sum, l) =>
              sum +
              Math.round(
                (new Date(l.release_date as Date).getTime() -
                  new Date(l.payment_posted_date as Date).getTime()) /
                  86400000
              ),
            0
          ) / released.length
        )
      : 0;

    return [
      {
        label: "Open lien balance",
        value: usdCompact(openBalance),
        hint: `Across ${open.length} liens not yet released`,
      },
      {
        label: "Discrepancies due in 5 days",
        value: String(dueInFive),
        hint: "Discrepancy liens with a deadline in the next 5 business days",
      },
      {
        label: "Releases waiting on approval",
        value: String(waiting),
        hint: "Reduction and release decisions waiting on Marcus",
      },
      {
        label: "Average days from payment to release",
        value: `${avgDays}`,
        hint: "Calendar days from payment posted to release date",
      },
    ];
  }, [liens]);

  const rows = useMemo(() => {
    const filtered = settledOnly
      ? liens.filter((l) => l.case_stage === "settled" || l.case_stage === "paid")
      : liens;
    return [...filtered].sort((a, b) => STAGE_ORDER[a.case_stage] - STAGE_ORDER[b.case_stage]);
  }, [liens, settledOnly]);

  return (
    <AppShell
      brandName={BRAND.name}
      brandUrl={BRAND.url}
      brandEmail={BRAND.email}
      personaName={PERSONA_NAME}
      personaRole={PERSONA_ROLE}
      nav={NAV}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
            Liens
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--pf-muted)]">
            Every open and recently released lien with its attorney, lien holder, billed total,
            payments posted and balance. Settled liens come first.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSettledOnly(true);
            logAction("Showing settled liens only", "filter-by-stage");
          }}
          data-action="filter-by-stage"
          aria-pressed={settledOnly}
          className="rounded-lg border border-[var(--pf-muted)]/30 px-3 py-2 text-sm"
        >
          Show settled only
        </button>
      </div>

      <div className="mt-6">
        <MetricPanel metrics={metrics} />
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
                </span>
              ),
            },
            {
              key: "attorney_firm",
              header: "Attorney firm",
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
                if (row.lien_status === "released") {
                  return (
                    <span className="text-[var(--pf-muted)]">
                      {row.release_date
                        ? `Released ${formatDate(new Date(row.release_date))}`
                        : "Released"}
                    </span>
                  );
                }
                const days = daysToDeadline(row);
                if (days === null) return <span className="text-[var(--pf-muted)]">No deadline</span>;
                return <span>{daysLabel(days)} left</span>;
              },
            },
            {
              key: "treatment_summary",
              header: "Treatment",
              render: (row) => row.treatment_summary,
            },
          ]}
          rows={rows}
          rowKey={(row) => row.lien_id}
          onRowClick={(row) => {
            logAction("Opened lien ledger", "open-lien");
            navigate(`/lien-case?case=${row.lien_id}`);
          }}
          dataTour="tracker-table"
          rowActionId="open-lien"
          mobileStatusKey="lien_status"
          mobileUrgencyKey="deadline"
        />
      </div>
    </AppShell>
  );
}
