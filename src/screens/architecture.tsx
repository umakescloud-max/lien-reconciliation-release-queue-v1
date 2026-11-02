import { AppShell, ArchitectureView, IntegrationTiles } from "@kit";
import { ARCHITECTURE } from "../seed";
import { shellProps } from "./shared";

export default function Architecture() {
  return (
    <AppShell {...shellProps}>
      <h1 className="text-2xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
        How it works
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--pf-muted)]">
        Where each piece runs, what data passes through it, and which parts hold patient data. Click
        any box in the diagram to read more.
      </p>

      <div className="mt-6">
        <ArchitectureView
          nodes={ARCHITECTURE.nodes}
          edges={ARCHITECTURE.edges}
          complianceNotes={ARCHITECTURE.complianceNotes}
        />
      </div>

      <div className="mt-8 max-w-3xl">
        <IntegrationTiles
          tools={["Microsoft Office"]}
          excludeLabels={ARCHITECTURE.nodes.map((node) => node.label)}
          title="Named tool"
        />
      </div>
    </AppShell>
  );
}
