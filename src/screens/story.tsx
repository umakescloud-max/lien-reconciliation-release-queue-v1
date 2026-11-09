import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppShell,
  OneClickLogin,
  StoryPanel,
  TaskList,
  TourRunner,
  startTour,
  useActivity,
} from "@kit";
import { NAV } from "../nav";
import tour from "../tour.json";
import { BRAND, PERSONA_NAME, PERSONA_ROLE, PRACTICE_NAME } from "../seed";

const LOGIN_KEY = "pf-login-lien-reconciliation-release-queue-v1";
const TOUR_KEY = "pf-tour-lien-reconciliation-release-queue-v1";

export default function Story() {
  const [loggedIn, setLoggedIn] = useState(() => {
    try {
      return window.localStorage.getItem(LOGIN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const navigate = useNavigate();
  const { logAction } = useActivity();

  if (!loggedIn) {
    return (
      <OneClickLogin
        personaName={PERSONA_NAME}
        personaRole={PERSONA_ROLE}
        practiceName={PRACTICE_NAME}
        onLogin={() => {
          try {
            window.localStorage.setItem(LOGIN_KEY, "1");
          } catch {
            // Private browsing: the demo still runs in memory for this visit.
          }
          setLoggedIn(true);
        }}
      />
    );
  }

  const startFullTour = () => {
    logAction("Tour started", "take-full-tour");
    startTour(tour, navigate);
  };

  return (
    <AppShell
      brandName={BRAND.name}
      brandUrl={BRAND.url}
      brandEmail={BRAND.email}
      personaName={PERSONA_NAME}
      personaRole={PERSONA_ROLE}
      nav={NAV}
    >
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
          Start here
        </h1>
        <p className="mt-2 text-[var(--pf-ink)]">
          For {PERSONA_NAME}, lien and LOP coordinator at an injury-first multi-specialty
          practice paid mostly through PIP, letters of protection and workers' comp, every settled
          lien is checked against what was paid and what the closing statement says before any
          release goes out.
        </p>

        <div className="mt-6">
          <TaskList tour={tour} />
        </div>

        <button
          type="button"
          onClick={startFullTour}
          data-action="take-full-tour"
          className="mt-4 rounded-lg border border-[var(--pf-primary)] px-4 py-2 text-sm font-medium text-[var(--pf-primary)]"
        >
          Take the full tour
        </button>

        <section className="mt-10">
          <h2 className="text-lg" style={{ fontFamily: "var(--pf-font-heading)" }}>
            Why this exists
          </h2>
          <details open className="mt-4">
            <summary className="cursor-pointer select-none text-sm font-medium">
              Marcus's Tuesday, before and after
            </summary>
            {/* The story panel carries its own tour button; the full tour is
                started once, from the button above the task list. */}
            <div className="mt-4 [&_button]:hidden">
              <StoryPanel
              practiceName={PRACTICE_NAME}
              practiceType="Injury-first multi-specialty practice: orthopedics, spine, interventional pain, physiatry and physical therapy, paid mostly through PIP, letters of protection and workers' comp"
              personaName={PERSONA_NAME}
              dayInTheLife="Marcus starts at 8:00am with 14 emails from law firms: 6 balance requests, 5 settlement notices and 3 requests for a lien release before disbursement. For each one he opens the patient ledger in the EHR, prints the itemized bill, checks yesterday's posted checks against the balance, and types a release letter from a Word template. Tallis Lien Funding has asked twice for status on 3 accounts it bought. By 11:30 he has released 4 liens and still has not reached the release request from Fenwright & Sallow that is due Friday."
              painPoints={[
                "No single list of which settled liens are paid in full, short-paid or still waiting on a check",
                "Short payments are found after a release letter has gone out, so the difference is written off without anyone approving it",
                "Liens sold to the funder are sometimes released without the funder's sign-off",
                "Attorneys wait days for a release and call to ask, which strains the referral relationship",
              ]}
              costOfPain="About 40 minutes per settled lien at 30 a week is roughly 20 coordinator hours a week. One release sent against a $6,200 check on an $11,400 bill writes off $5,200 that nobody approved."
              before="Tuesday, 8:00am. Marcus has 14 law firm emails and works them in the order they arrived. At 2:15pm he reaches lien 5208 (L. Haddad, T-bone collision, cervical disc herniation) from Fenwright & Sallow Injury Law. A $6,200 check was posted yesterday against an $11,400 bill, and the attorney's email says the lien was reduced and asks for a release by Friday. Marcus finds no reduction agreement anywhere. He emails the attorney, flags it in the spreadsheet, and the firm calls the front desk twice before he answers."
              after="Tuesday, 8:00am. Marcus opens the lien desk. 22 settled liens already match their payments and sit in release review. Lien 5208 is at the top of Discrepancies, flagged 'Payment short of balance, no reduction on file', with 3 days left before the firm's disbursement deadline. He attaches the firm's reduction letter, sees the offer is above the practice's floor, moves it to release review and approves it. The release letter goes to the firm by 8:40am."
                onStartTour={() => startTour(tour, navigate)}
              />
            </div>
          </details>
        </section>
      </div>

      <TourRunner steps={tour} storageKey={TOUR_KEY} />
    </AppShell>
  );
}
