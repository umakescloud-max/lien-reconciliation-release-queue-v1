import { AppShell, ArchitectureView, IntegrationTiles } from "@kit";
import { NAV } from "../nav";
import { ARCHITECTURE, BRAND, PERSONA_NAME, PERSONA_ROLE } from "../seed";

export default function Architecture() {
  const nodeLabels = ARCHITECTURE.nodes.map((node) => node.label);
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
        How it works
      </h1>
      <p className="mt-1 max-w-3xl text-sm text-[var(--pf-muted)]">
        Where each piece runs, what data passes through it and which parts hold patient data. Click
        any box for detail.
      </p>
      <div className="mt-6">
        <ArchitectureView
          nodes={ARCHITECTURE.nodes}
          edges={ARCHITECTURE.edges}
          complianceNotes={ARCHITECTURE.compliance_notes}
        />
      </div>
      <div className="mt-8">
        <IntegrationTiles
          tools={["Microsoft Office"]}
          excludeLabels={nodeLabels}
          title="Named tools"
        />
      </div>
    </AppShell>
  );
}
