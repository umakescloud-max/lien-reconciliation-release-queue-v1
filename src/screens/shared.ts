import type { AppShellProps, StatusTone } from "@kit";
import { NAV } from "../nav";
import type { CaseStage, LienStatus } from "../seed";

export const shellProps: Omit<AppShellProps, "children"> = {
  brandName: "Umakes.cloud",
  brandUrl: "https://umakes.cloud",
  brandEmail: "umakescloud@gmail.com",
  personaName: "Marcus Odum",
  personaRole: "Lien and LOP coordinator",
  nav: NAV,
};

export function usd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** Compact form for large totals, so a stat tile never overflows on a phone. */
export function usdCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000) return `$${Math.round(value / 1000)}k`;
  return usd(value);
}

/** Whole calendar days from today to a date, computed from the date itself. */
export function daysUntil(value: Date | null): number | null {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function daysLabel(value: Date | null): string {
  const days = daysUntil(value);
  if (days === null) return "No disbursement deadline";
  if (days < 0) return "Deadline passed";
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}

export function lienStatusLabel(status: LienStatus): string {
  if (status === "release review") return "Release review";
  return `${status[0].toUpperCase()}${status.slice(1)}`;
}

export function lienStatusTone(status: LienStatus): StatusTone {
  if (status === "discrepancy") return "accent";
  if (status === "release review") return "primary";
  return "muted";
}

export function caseStageLabel(stage: CaseStage): string {
  if (stage === "demand sent") return "Demand sent";
  if (stage === "in litigation") return "In litigation";
  return `${stage[0].toUpperCase()}${stage.slice(1)}`;
}

export function caseStageTone(stage: CaseStage): StatusTone {
  if (stage === "settled") return "accent";
  if (stage === "paid") return "primary";
  return "muted";
}

export function paymentPayer(lien: { lien_holder: string; attorney_firm: string }): string {
  return lien.lien_holder === "Tallis Lien Funding"
    ? lien.lien_holder
    : `${lien.attorney_firm} trust account`;
}
