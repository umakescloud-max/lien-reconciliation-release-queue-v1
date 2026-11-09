import type { NavItem } from "@kit";

// The document title lives in index.html, which is outside what a builder
// may edit; set it here so the browser tab names this desk, not the starter.
if (typeof document !== "undefined") {
  document.title = "Lien reconciliation and release desk — concept prototype";
}

export const NAV: NavItem[] = [
  { label: "Start here", to: "/" },
  { label: "Liens", to: "/liens" },
  { label: "Closing statements", to: "/closing" },
  { label: "Discrepancies", to: "/discrepancies" },
  { label: "Release review", to: "/releases" },
  { label: "Costs", to: "/costs" },
  { label: "How it works", to: "/architecture" },
];
