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
import tour from "../tour.json";
import { shellProps } from "./shared";

const LOGIN_KEY = "pf-login-lien-reconciliation-release-queue-v1";
const TOUR_KEY = "pf-tour-lien-reconciliation-release-queue-v1";

const PRACTICE_TYPE =
  "Injury-first multi-specialty practice: orthopedics, spine, interventional pain, physiatry and physical therapy, paid mostly through PIP, letters of protection and workers' comp";

const DAY_IN_THE_LIFE =
  "Marcus starts at 8:00am with 14 emails from law firms: 6 balance requests, 5 settlement notices and 3 requests for a lien release before disbursement. For each one he opens the patient ledger in the EHR, prints the itemized bill, checks yesterday's posted checks against the balance, and types a release letter from a Word template. Tallis Lien Funding has asked twice for status on 3 accounts it bought. By 11:30 he has released 4 liens and still has not reached the release request from Fenwright & Sallow that is due Friday.";

const PAIN_POINTS = [
  "No single list of which settled liens are paid in full, short-paid or still waiting on a check",
  "Short payments are found after a release letter has gone out, so the difference is written off without anyone approving it",
  "Liens sold to the funder are sometimes released without the funder's sign-off",
  "Attorneys wait days for a release and call to ask, which strains the referral relationship",
];

const COST_OF_PAIN =
  "About 40 minutes per settled lien at 30 a week is roughly 20 coordinator hours a week. One release sent against a $6,200 check on an $11,400 bill writes off $5,200 that nobody approved.";

const BEFORE =
  "Tuesday, 8:00am. Marcus has 14 law firm emails and works them in the order they arrived. At 2:15pm he reaches lien 5208 (L. Haddad, T-bone collision, cervical disc herniation) from Fenwright & Sallow Injury Law. A $6,200 check was posted yesterday against an $11,400 bill, and the attorney's email says the lien was reduced and asks for a release by Friday. Marcus finds no reduction agreement anywhere. He emails the attorney, flags it in the spreadsheet, and the firm calls the front desk twice before he answers.";

const AFTER =
  "Tuesday, 8:00am. Marcus opens the lien desk. 22 settled liens already match their payments and sit in release review. Lien 5208 is at the top of Discrepancies, flagged 'Payment short of balance, no reduction on file', with 3 days left before the firm's disbursement deadline. He attaches the firm's reduction letter, sees the offer is above the practice's floor, moves it to release review and approves it. The release letter goes to the firm by 8:40am.";

export default function Story() {
  const navigate = useNavigate();
  const { logAction } = useActivity();
  const [loggedIn, setLoggedIn] = useState(() => {
    try {
      return window.localStorage.getItem(LOGIN_KEY) === "1";
    } catch {
      return false;
    }
  });

  const login = () => {
    try {
      window.localStorage.setItem(LOGIN_KEY, "1");
    } catch {
      // Private browsing: the demo still works for this visit.
    }
    setLoggedIn(true);
  };

  if (!loggedIn) {
    return (
      <OneClickLogin
        personaName="Marcus Odum"
        personaRole="Lien and LOP coordinator"
        practiceName="Larkfield Injury & Spine Group"
        onLogin={login}
      />
    );
  }

  return (
    <AppShell {...shellProps}>
      <h1 className="text-2xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
        Start here
      </h1>
      <p className="mt-2 max-w-3xl text-[var(--pf-muted)]">
        For Marcus Odum, the lien and LOP coordinator at Larkfield Injury &amp; Spine Group, an
        injury-first multi-specialty practice paid mostly through PIP, letters of protection and
        workers' comp.
      </p>

      <div className="mt-6 max-w-3xl">
        <TaskList tour={tour} />
      </div>

      <div className="mt-4 max-w-3xl">
        <button
          type="button"
          data-action="take-full-tour"
          onClick={() => {
            logAction("Tour started", "take-full-tour");
            startTour(tour, navigate);
          }}
          className="rounded-lg border border-[var(--pf-primary)] px-4 py-2 text-sm font-medium text-[var(--pf-primary)]"
        >
          Take the full tour
        </button>
      </div>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-lg" style={{ fontFamily: "var(--pf-font-heading)" }}>
          Why this exists
        </h2>
        <div className="mt-4">
          <StoryPanel
            practiceName="Larkfield Injury & Spine Group"
            practiceType={PRACTICE_TYPE}
            personaName="Marcus Odum"
            dayInTheLife={DAY_IN_THE_LIFE}
            painPoints={PAIN_POINTS}
            costOfPain={COST_OF_PAIN}
            before={BEFORE}
            after={AFTER}
            onStartTour={() => startTour(tour, navigate)}
          />
        </div>
      </section>

      <TourRunner steps={tour} storageKey={TOUR_KEY} />
    </AppShell>
  );
}
