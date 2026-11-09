# Decisions

- The reviewer asked for persona/pain/before-after to sit in a collapsed `<details>` on Start here, while the gate contract requires tour targets to be visible on load without clicks. I used `<details open>` (collapsible, but open by default) and hid the kit-rendered "Start the tour" button inside it with `[&_button]:hidden`, leaving "Take the full tour" as the single tour entry point.
- `SampleDocuments` in the kit logs the action but cannot change screen records, so both screens wire the sample to the same handler as their action button via `useDemoState`/`useDemo().completed`; a persisted "sample already applied" flag keeps it idempotent across reloads.
- The drop zone and file picker are guarded in the capture phase on a wrapper around `SampleDocuments`, so another screen's sample file is refused with the kit's `REFUSAL` message and no task tick.
- `ApprovalQueue` cannot render a per-card primary plus secondary on secondary cards, so Release review renders the kit queue for the selected lien only (giving the primary Approve) and custom selectable cards for the others. Focus defaults to lien 5208 so the gate's edge-case/action lookups always resolve.
- Closing statements: once the resolution is signed, Send reduction proposal and Record signed resolution are disabled rather than removed, with a note explaining why, so the controls stay discoverable.
- Liens are generated with an initial-plus-surname patient format (`L. Haddad`) across seed data, and the tab title is set from `src/nav.ts` because `index.html` is outside the edit scope.
