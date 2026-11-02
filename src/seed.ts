import {
  createNameGenerator,
  pickOne,
  randomInt,
  rel,
  rng,
  shuffle,
  type ArchEdge,
  type ArchNode,
} from "@kit";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LienStatus = "active" | "discrepancy" | "release review" | "released";
export type CaseStage = "treating" | "demand sent" | "in litigation" | "settled" | "paid";

export interface Lien {
  id: string;
  patient_name: string;
  date_of_injury: Date;
  injury_type: string;
  attorney_firm: string;
  attorney_contact: string;
  lien_holder: string;
  case_stage: CaseStage;
  lien_status: LienStatus;
  billed_total: number;
  payments_posted: number;
  lien_balance: number;
  requested_reduction: number | null;
  reduction_floor: number;
  settlement_amount_reported: number | null;
  payment_posted_date: Date | null;
  disbursement_deadline: Date | null;
  discrepancy_reason: string;
  release_date: Date | null;
  last_attorney_contact: Date;
  treatment_summary: string;
}

export interface Payment {
  id: string;
  lien_id: string;
  payer: string;
  amount: number;
  posted_date: Date;
  check_number: string;
  posted_by: string;
}

export interface LienNote {
  id: string;
  lien_id: string;
  author: string;
  timestamp: Date;
  note_text: string;
}

// ---------------------------------------------------------------------------
// Fixed vocabulary
// ---------------------------------------------------------------------------

export const PRACTICE_NAME = "Larkfield Injury & Spine Group";
export const FUNDER_NAME = "Tallis Lien Funding";

const LAW_FIRMS = [
  "Fenwright & Sallow Injury Law",
  "Marrow Creek Trial Lawyers",
  "Alderton & Pike Injury Attorneys",
  "Bramwell Ross Law Group",
  "Cassidy Vane Injury Counsel",
  "Delacroix Trial Partners",
];

const DISCREPANCY_REASONS = [
  "Payment short of balance, no reduction on file",
  "Payment posted to wrong patient account",
  "Lien sold to funder, release needs funder sign-off",
  "New attorney has no signed lien",
  "Settlement check not yet cleared",
];

const TIMES: `${number}:${number}`[] = [
  "09:30",
  "10:15",
  "11:45",
  "14:10",
  "16:40",
  "17:00",
];

interface InjuryProfile {
  type: string;
  treatment: string;
  min: number;
  max: number;
}

const INJURIES: InjuryProfile[] = [
  {
    type: "Cervical disc herniation",
    treatment: "Cervical epidural injections x2, 18 PT visits",
    min: 9500,
    max: 16500,
  },
  {
    type: "Lumbar disc herniation",
    treatment: "Lumbar epidural injections x3, 24 PT visits",
    min: 8800,
    max: 19800,
  },
  {
    type: "Lumbar radiculopathy",
    treatment: "Lumbar radiofrequency ablation, 22 PT visits",
    min: 7600,
    max: 17400,
  },
  {
    type: "Rotator cuff tear",
    treatment: "Shoulder arthroscopy, 20 PT visits",
    min: 12400,
    max: 26800,
  },
  {
    type: "Knee ligament sprain",
    treatment: "Knee MRI, 16 PT visits",
    min: 3200,
    max: 9800,
  },
  {
    type: "Tibia fracture",
    treatment: "Fracture care, imaging and 12 PT visits",
    min: 6800,
    max: 22400,
  },
  {
    type: "Whiplash injury",
    treatment: "Manual therapy x12, 10 PT visits",
    min: 1800,
    max: 7600,
  },
  {
    type: "Shoulder strain",
    treatment: "Shoulder injection, 14 PT visits",
    min: 2900,
    max: 8600,
  },
];

const NOTE_AUTHORS = ["Marcus Odum", "Joaquin Reyes", "Renata Ilves"];

const GENERAL_NOTES = [
  "Demand package sent to the carrier by the attorney.",
  "Settlement notice received by email; balance confirmed against the ledger.",
  "Payment posted and matched to the open balance.",
  "Attorney's office asked for a current itemized balance.",
  "Lien holder confirmed the account is still open.",
  "Referral packet updated with the latest treatment dates.",
];

// ---------------------------------------------------------------------------
// Deterministic generation
// ---------------------------------------------------------------------------

const rand = rng("lien-reconciliation-release-queue-v1");
const patientNames = createNameGenerator(rng("lien-patients"));
const attorneyNames = createNameGenerator(rng("lien-attorneys"));

function statusFor(index: number): LienStatus {
  if (index < 9) return "discrepancy";
  if (index < 15) return "release review";
  if (index < 31) return "released";
  return "active";
}

function activeStage(index: number): CaseStage {
  const position = index - 31;
  if (position < 6) return "settled";
  if (position < 12) return "paid";
  if (position < 60) return "treating";
  if (position < 88) return "demand sent";
  return "in litigation";
}

function reasonFor(index: number): string {
  if (index === 0) return DISCREPANCY_REASONS[0];
  return DISCREPANCY_REASONS[((index - 1) % 4) + 1];
}

const idPool: string[] = [];
for (let n = 5100; n <= 5299; n += 1) idPool.push(String(n));
const ids = [
  "5208",
  ...shuffle(
    rand,
    idPool.filter((id) => id !== "5208"),
  ).slice(0, 139),
];

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export const LIENS_SEED: Lien[] = ids.map((id, index) => {
  if (id === "5208") {
    return {
      id: "5208",
      patient_name: "L. Haddad",
      date_of_injury: rel(-420, "10:15"),
      injury_type: "Cervical disc herniation",
      attorney_firm: "Fenwright & Sallow Injury Law",
      attorney_contact: attorneyNames.next(),
      lien_holder: PRACTICE_NAME,
      case_stage: "settled",
      lien_status: "discrepancy",
      billed_total: 11400,
      payments_posted: 6200,
      lien_balance: 5200,
      requested_reduction: null,
      reduction_floor: 6000,
      settlement_amount_reported: 48000,
      payment_posted_date: rel(-1, "14:20"),
      disbursement_deadline: rel(3, "17:00"),
      discrepancy_reason: DISCREPANCY_REASONS[0],
      release_date: null,
      last_attorney_contact: rel(-1, "16:40"),
      treatment_summary: "Cervical epidural injections x2, 18 PT visits",
    };
  }

  const status = statusFor(index);
  const injury = pickOne(rand, INJURIES);
  const billed = roundTo(randomInt(rand, injury.min, injury.max), 50);
  const stage: CaseStage =
    status === "released" ? "paid" : status === "active" ? activeStage(index) : "settled";
  const hasPayment = index < 70;

  let paymentsPosted = 0;
  let lienBalance = billed;
  let requestedReduction: number | null = null;
  let paymentPostedDate: Date | null = null;
  let releaseDate: Date | null = null;

  if (hasPayment) {
    if (status === "released") {
      const releaseDaysAgo = randomInt(rand, 1, 30);
      const gap = randomInt(rand, 2, 9);
      releaseDate = rel(-releaseDaysAgo, pickOne(rand, TIMES));
      paymentPostedDate = rel(-(releaseDaysAgo + gap), pickOne(rand, TIMES));
      paymentsPosted = Math.min(billed, roundTo(billed * (0.55 + rand() * 0.4), 50));
      lienBalance = 0;
      requestedReduction = Math.max(0, billed - paymentsPosted);
    } else if (status === "release review") {
      paymentPostedDate = rel(-randomInt(rand, 2, 20), pickOne(rand, TIMES));
      paymentsPosted = Math.min(billed, roundTo(billed * (0.45 + rand() * 0.3), 50));
      lienBalance = billed - paymentsPosted;
      requestedReduction = lienBalance;
    } else if (status === "discrepancy") {
      paymentPostedDate = rel(-randomInt(rand, 1, 20), pickOne(rand, TIMES));
      paymentsPosted = Math.min(billed, roundTo(billed * (0.35 + rand() * 0.35), 50));
      lienBalance = billed - paymentsPosted;
    } else {
      paymentPostedDate = rel(-randomInt(rand, 3, 55), pickOne(rand, TIMES));
      paymentsPosted = Math.min(billed, roundTo(billed * (0.2 + rand() * 0.45), 50));
      lienBalance = billed - paymentsPosted;
    }
  }

  const deadlineApplies = stage === "settled" || stage === "paid";
  const disbursementDeadline = deadlineApplies
    ? rel(randomInt(rand, 1, 14), pickOne(rand, TIMES))
    : null;

  const settlementAmount = deadlineApplies
    ? roundTo(randomInt(rand, Math.max(12000, billed + 1000), 78000), 500)
    : null;

  const discrepancyReason = status === "discrepancy" ? reasonFor(index) : "";
  const funderReason = discrepancyReason === DISCREPANCY_REASONS[2];
  const lienHolder = funderReason || rand() < 0.15 ? FUNDER_NAME : PRACTICE_NAME;

  return {
    id,
    patient_name: patientNames.next(),
    date_of_injury: rel(-randomInt(rand, 90, 900), pickOne(rand, TIMES)),
    injury_type: injury.type,
    attorney_firm: pickOne(rand, LAW_FIRMS),
    attorney_contact: attorneyNames.next(),
    lien_holder: lienHolder,
    case_stage: stage,
    lien_status: status,
    billed_total: billed,
    payments_posted: paymentsPosted,
    lien_balance: lienBalance,
    requested_reduction: requestedReduction,
    reduction_floor: roundTo(billed * 0.55, 50),
    settlement_amount_reported: settlementAmount,
    payment_posted_date: paymentPostedDate,
    disbursement_deadline: disbursementDeadline,
    discrepancy_reason: discrepancyReason,
    release_date: releaseDate,
    last_attorney_contact: rel(-randomInt(rand, 1, 21), pickOne(rand, TIMES)),
    treatment_summary: injury.treatment,
  };
});

// ---------------------------------------------------------------------------
// Payments posted to the lien ledger
// ---------------------------------------------------------------------------

export const PAYMENTS: Payment[] = LIENS_SEED.filter(
  (lien) => lien.payment_posted_date !== null && lien.payments_posted > 0,
).map((lien) => ({
  id: `payment-${lien.id}`,
  lien_id: lien.id,
  payer:
    lien.lien_holder === FUNDER_NAME
      ? FUNDER_NAME
      : `${lien.attorney_firm} trust account`,
  amount: lien.payments_posted,
  posted_date: lien.payment_posted_date as Date,
  check_number: String(randomInt(rand, 10000, 99999)),
  posted_by: pickOne(rand, ["Joaquin Reyes", "Renata Ilves"]),
}));

// ---------------------------------------------------------------------------
// Lien notes (2 per lien, plus a third for the first 40 liens: 320 total)
// ---------------------------------------------------------------------------

function statusNote(status: LienStatus): string {
  if (status === "released") return "Release letter sent and the ledger closed.";
  if (status === "release review") {
    return "Reduction requested; waiting on the coordinator's approval.";
  }
  if (status === "discrepancy") {
    return "Payment does not match the ledger; flagged for review.";
  }
  return "Attorney's office asked for a status update.";
}

export const LIEN_NOTES: LienNote[] = [];

for (const [index, lien] of LIENS_SEED.entries()) {
  if (lien.id === "5208") {
    LIEN_NOTES.push({
      id: "note-5208-1",
      lien_id: "5208",
      author: "Marcus Odum",
      timestamp: rel(-418, "10:30"),
      note_text: "LOP signed by the patient and sent to the referring firm.",
    });
    LIEN_NOTES.push({
      id: "note-5208-2",
      lien_id: "5208",
      author: "Joaquin Reyes",
      timestamp: rel(-1, "14:20"),
      note_text:
        "Payment posted: $6,200 from Fenwright & Sallow Injury Law trust account.",
    });
    LIEN_NOTES.push({
      id: "note-5208-3",
      lien_id: "5208",
      author: "Marcus Odum",
      timestamp: rel(-1, "16:40"),
      note_text:
        "Settlement notice by email, attorney says lien reduced, no agreement found.",
    });
    continue;
  }

  const lopAt = new Date(lien.date_of_injury);
  lopAt.setDate(lopAt.getDate() + 2);
  lopAt.setHours(10, 30, 0, 0);

  LIEN_NOTES.push({
    id: `note-${lien.id}-1`,
    lien_id: lien.id,
    author: "Marcus Odum",
    timestamp: lopAt,
    note_text: "LOP signed by the patient and sent to the referring firm.",
  });
  LIEN_NOTES.push({
    id: `note-${lien.id}-2`,
    lien_id: lien.id,
    author: pickOne(rand, NOTE_AUTHORS),
    timestamp: rel(-randomInt(rand, 3, 45), pickOne(rand, TIMES)),
    note_text: pickOne(rand, GENERAL_NOTES),
  });
  if (index < 40) {
    LIEN_NOTES.push({
      id: `note-${lien.id}-3`,
      lien_id: lien.id,
      author: pickOne(rand, NOTE_AUTHORS),
      timestamp: rel(-randomInt(rand, 1, 15), pickOne(rand, TIMES)),
      note_text: statusNote(lien.lien_status),
    });
  }
}

// ---------------------------------------------------------------------------
// Architecture (copied unchanged from the brief)
// ---------------------------------------------------------------------------

export const ARCHITECTURE: {
  nodes: ArchNode[];
  edges: ArchEdge[];
  complianceNotes: string[];
} = {
  nodes: [
    {
      id: "attorney-inbox",
      label: "Law firm email and fax inbox",
      kind: "system",
      does: "Receives settlement notices, reduction requests and release requests from law firms.",
      data: "Settlement letters, reduction requests",
      stores_patient_data: true,
      runs_in: "vendor-system",
    },
    {
      id: "ehr-ledger",
      label: "Practice EHR and billing ledger",
      kind: "system",
      does: "Holds the itemized charges and the payments the payment poster enters.",
      data: "Charges, payments posted, balances",
      stores_patient_data: true,
      runs_in: "vendor-system",
    },
    {
      id: "lien-desk",
      label: "Lien desk (this prototype)",
      kind: "app",
      does: "Matches each settlement and payment to the lien ledger, flags mismatches and holds releases for approval. In this demo it runs in your browser with synthetic data.",
      data: "Lien status, balances, discrepancy reasons, deadlines",
      stores_patient_data: true,
      runs_in: "client-cloud",
    },
    {
      id: "document-reader",
      label: "Document reader (AI)",
      kind: "model",
      does: "Reads settlement and reduction letters for the amounts, the firm and the deadline.",
      data: "Letter text only, no chart data",
      stores_patient_data: false,
      runs_in: "client-cloud",
    },
    {
      id: "letter-templates",
      label: "Release letter templates (Microsoft Office)",
      kind: "system",
      does: "Fills the practice's lien release letter with the approved amounts.",
      data: "Patient name, firm, approved amount",
      stores_patient_data: false,
      runs_in: "vendor-system",
    },
    {
      id: "coordinator",
      label: "Marcus (lien and LOP coordinator)",
      kind: "human",
      does: "Reviews discrepancies and approves every reduction and release.",
      data: "Everything in the desk for his liens",
      stores_patient_data: false,
      runs_in: "person",
    },
    {
      id: "law-firms",
      label: "Referring law firms",
      kind: "external",
      does: "Send settlement notices and payments, and receive signed releases.",
      data: "Balances and release letters only",
      stores_patient_data: false,
      runs_in: "outside-party",
    },
    {
      id: "funder",
      label: "Tallis Lien Funding",
      kind: "external",
      does: "Owns purchased liens and signs off before those are released.",
      data: "Status and balances for purchased liens only",
      stores_patient_data: false,
      runs_in: "outside-party",
    },
  ],
  edges: [
    {
      from: "attorney-inbox",
      to: "lien-desk",
      label: "Settlement and reduction letters",
    },
    {
      from: "ehr-ledger",
      to: "lien-desk",
      label: "Charges and payments posted",
    },
    {
      from: "lien-desk",
      to: "document-reader",
      label: "Letter text",
    },
    {
      from: "document-reader",
      to: "lien-desk",
      label: "Amounts, firm, deadline",
    },
    {
      from: "lien-desk",
      to: "coordinator",
      label: "Discrepancies and releases to approve",
    },
    {
      from: "coordinator",
      to: "letter-templates",
      label: "Approved release",
    },
    {
      from: "letter-templates",
      to: "law-firms",
      label: "Signed lien release",
    },
    {
      from: "lien-desk",
      to: "funder",
      label: "Status on purchased liens",
    },
  ],
  complianceNotes: [
    "A real build runs in the practice's own cloud account, with access limited by role and every action logged.",
    "The document reader sees letter text only, never the chart, and patient data is never sent to a model without a signed BAA.",
    "Law firms and the funder receive balances and releases only, never clinical details.",
    "This prototype uses synthetic data and simulated roles.",
  ],
};
