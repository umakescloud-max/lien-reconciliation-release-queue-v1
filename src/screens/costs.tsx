import { AppShell, SavingsCalculator } from "@kit";
import { NAV } from "../nav";
import { BRAND, PERSONA_NAME, PERSONA_ROLE } from "../seed";

export default function Costs() {
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
        What this work costs today
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--pf-muted)]">
        Put in your own settled-lien volume, minutes and coordinator rate. Nothing you type leaves
        this page.
      </p>
      <div className="mt-6">
        <SavingsCalculator />
      </div>
    </AppShell>
  );
}
