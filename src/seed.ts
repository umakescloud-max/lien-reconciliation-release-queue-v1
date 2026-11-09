// Deterministic seed data for the lien reconciliation and release desk.
// Every date is produced with rel() so "today" is always today, and every
// random pick comes from the kit's seeded PRNG so the demo is stable.

import {
  CPT_CODES,
  createNameGenerator,
  fakeInitialName,
  pickOne,
  randomInt,
  rel,
  rng,
  shuffle,
  type ArchEdge,
  type ArchNode,
} from "@kit";

export const PRACTICE_NAME = "Larkfield Injury & Spine Group";
export const PERSONA_NAME = "Marcus Odum";
export const PERSONA_ROLE = "Lien and LOP coordinator";
export const BRAND = {
  name: "Umakes.cloud",
  url: "https://umakes.cloud",
  email: "umakescloud@gmail.com",
};
export const EDGE_LIEN_ID = "5208";

export type CaseStage = "treating" | "demand sent" | "in litigation" | "settled" | "paid";
export type LienStatus = "active" | "discrepancy" | "release review" | "released";

export interface Lien {
  lien_id: string;
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
  discrepancy_reason: string | null;
  release_date: Date | null;
  last_attorney_contact: Date | null;
  treatment_summary: string;
}

export interface Payment {
  payment_id: string;
  lien_id: string;
  payer: string;
  amount: number;
  posted_date: Date;
  check_number: string;
  posted_by: string;
}

export type ResolutionStatus = "signed" | "proposal sent" | "none on file";
export type MatchStatus = "matches" | "awaiting signed resolution" | "mismatch";

export interface ClosingStatement {
  statement_id: string;
  lien_id: string;
  patient_name: string;
  attorney_firm: string;
  received_date: Date;
  gross_settlement: number;
  attorney_fee: number;
  case_costs: number;
  other_liens_total: number;
  other_lien_types: string;
  statement_lien_amount: number;
  proposal_amount: number | null;
  resolution_amount: number | null;
  resolution_status: ResolutionStatus;
  resolution_signed_date: Date | null;
  net_to_client: number;
  match_status: MatchStatus;
  disbursement_deadline: Date | null;
}

export interface LienNote {
  note_id: string;
  lien_id: string;
  author: string;
  timestamp: Date;
  note_text: string;
}

const rand = rng("lien-reconciliation-release-queue-v1");
const patientNames = createNameGenerator(rand);

// One name format for every patient in the demo: initial plus surname, the
// way a lien ledger and the brief's own records ("L. Haddad") write it.
const nextPatientName = (): string => {
  const full = patientNames.next();
  const [first, ...rest] = full.split(" ");
  return `${first[0]}. ${rest.join(" ")}`;
};

const FUNDER = "Tallis Lien Funding";
const FIRMS = [
  "Fenwright & Sallow Injury Law",
  "Marrow Creek Trial Lawyers",
  "Halbrook & Vance Trial Attorneys",
  "Somerset Injury Counsel",
  "Drayton Legal Group",
  "Pinehurst Accident Law",
];
const STAFF = ["Marcus Odum", "Joaquin Reyes", "Renata Ilves"];
const INJURIES = [
  "Cervical disc herniation",
  "Lumbar strain with facet pain",
  "Lumbar disc herniation",
  "Rotator cuff tear",
  "Cervical facet arthropathy",
  "Thoracic strain",
  "Knee sprain with meniscal tear",
  "Lumbar radiculopathy",
];
const TREATMENTS = [
  "Cervical epidural injections x2, 18 PT visits",
  "Lumbar facet injections x3, 24 PT visits",
  "Lumbar radiofrequency ablation x1, 20 PT visits",
  "Shoulder arthroscopy, 20 PT visits",
  "Medial branch blocks x3, 12 PT visits",
  "Cervical facet injections x2, 16 PT visits",
  "Physical therapy only, 30 visits",
  "Spine surgery consult, 10 PT visits",
];

interface BuildOptions {
  patient: string;
  stage: CaseStage;
  status: LienStatus;
  firm: string;
  billed: number;
  payments: number;
  holder?: string;
  deadline?: Date | null;
  paymentDate?: Date | null;
  releaseDate?: Date | null;
  requested?: number | null;
  reason?: string | null;
  injury?: string;
  treatment?: string;
  lastContact?: Date | null;
  settlement?: number | null;
}

function buildLien(id: string, o: BuildOptions): Lien {
  return {
    lien_id: id,
    patient_name: o.patient,
    date_of_injury: rel(-randomInt(rand, 90, 900)),
    injury_type: o.injury ?? pickOne(rand, INJURIES),
    attorney_firm: o.firm,
    attorney_contact: fakeInitialName(rand),
    lien_holder: o.holder ?? PRACTICE_NAME,
    case_stage: o.stage,
    lien_status: o.status,
    billed_total: o.billed,
    payments_posted: o.payments,
    lien_balance: Math.max(0, o.billed - o.payments),
    requested_reduction: o.requested ?? null,
    reduction_floor: Math.round(o.billed * 0.55),
    settlement_amount_reported: o.settlement ?? null,
    payment_posted_date: o.paymentDate ?? null,
    disbursement_deadline: o.deadline ?? null,
    discrepancy_reason: o.reason ?? null,
    release_date: o.releaseDate ?? null,
    last_attorney_contact: o.lastContact ?? null,
    treatment_summary: o.treatment ?? pickOne(rand, TREATMENTS),
  };
}

// The edge case, exactly as the brief describes it. It sits first in the
// array so the Discrepancies table (which preserves seed order) shows it at
// the top, and so row keys come from the record id.
const lien5208: Lien = {
  lien_id: "5208",
  patient_name: "L. Haddad",
  date_of_injury: rel(-420),
  injury_type: "Cervical disc herniation",
  attorney_firm: "Fenwright & Sallow Injury Law",
  attorney_contact: "D. Fenwick",
  lien_holder: PRACTICE_NAME,
  case_stage: "settled",
  lien_status: "discrepancy",
  billed_total: 11400,
  payments_posted: 6200,
  lien_balance: 5200,
  requested_reduction: null,
  reduction_floor: 6000,
  settlement_amount_reported: 48000,
  payment_posted_date: rel(-1),
  disbursement_deadline: rel(3),
  discrepancy_reason: "Payment short of balance, no reduction on file",
  release_date: null,
  last_attorney_contact: rel(-1, "16:40"),
  treatment_summary: "Cervical epidural injections x2, 18 PT visits",
};

const lien5163: Lien = {
  lien_id: "5163",
  patient_name: "K. Brandt",
  date_of_injury: rel(-330),
  injury_type: "Lumbar strain with facet pain",
  attorney_firm: "Marrow Creek Trial Lawyers",
  attorney_contact: "S. Marrow",
  lien_holder: PRACTICE_NAME,
  case_stage: "settled",
  lien_status: "active",
  billed_total: 7900,
  payments_posted: 0,
  lien_balance: 7900,
  requested_reduction: null,
  reduction_floor: 4345,
  settlement_amount_reported: 36000,
  payment_posted_date: null,
  disbursement_deadline: rel(5),
  discrepancy_reason: null,
  release_date: null,
  last_attorney_contact: rel(-9),
  treatment_summary: "Lumbar facet injections x3, 24 PT visits",
};

const lien5137: Lien = {
  lien_id: "5137",
  patient_name: nextPatientName(),
  date_of_injury: rel(-260),
  injury_type: "Lumbar disc herniation",
  attorney_firm: "Fenwright & Sallow Injury Law",
  attorney_contact: "D. Fenwick",
  lien_holder: PRACTICE_NAME,
  case_stage: "settled",
  lien_status: "active",
  billed_total: 9800,
  payments_posted: 0,
  lien_balance: 9800,
  requested_reduction: null,
  reduction_floor: 5390,
  settlement_amount_reported: 52000,
  payment_posted_date: null,
  disbursement_deadline: rel(8),
  discrepancy_reason: null,
  release_date: null,
  last_attorney_contact: rel(-6),
  treatment_summary: "Lumbar radiofrequency ablation x1, 20 PT visits",
};

const RESERVED = new Set(["5208", "5163", "5137"]);
const ALL_IDS = Array.from({ length: 200 }, (_, i) => String(5100 + i));
const idPool = shuffle(rand, ALL_IDS.filter((id) => !RESERVED.has(id)));
let idCursor = 0;
const nextId = () => idPool[idCursor++];

const DISC_REASONS = [
  "Payment short of balance, no reduction on file",
  "Payment posted to wrong patient account",
  "Lien sold to funder, release needs funder sign-off",
  "New attorney has no signed lien",
  "Settlement check not yet cleared",
];

const discrepancyLiens: Lien[] = [];
for (let i = 0; i < 8; i++) {
  const billed = randomInt(rand, 2600, 24000);
  let payments = 0;
  let holder = PRACTICE_NAME;
  let reason = DISC_REASONS[i % DISC_REASONS.length];
  if (i === 0) reason = "Closing statement lists less than signed resolution";
  if (reason.startsWith("Payment short")) payments = Math.round(billed * (0.35 + rand() * 0.18));
  else if (reason.startsWith("Lien sold")) {
    holder = FUNDER;
    payments = Math.round(billed * (0.45 + rand() * 0.2));
  } else if (reason.startsWith("Settlement check")) payments = Math.round(billed * (0.55 + rand() * 0.15));
  // "Payment posted to wrong patient account" and "New attorney has no
  // signed lien" leave the balance untouched.
  discrepancyLiens.push(
    buildLien(nextId(), {
      patient: nextPatientName(),
      stage: i % 3 === 0 ? "paid" : "settled",
      status: "discrepancy",
      firm: pickOne(rand, FIRMS),
      holder,
      billed,
      payments,
      deadline: rel(randomInt(rand, 1, 14)),
      paymentDate: payments > 0 ? rel(-randomInt(rand, 1, 30)) : null,
      requested: null,
      reason,
      lastContact: rel(-randomInt(rand, 1, 10)),
      settlement: randomInt(rand, 18000, 150000),
    })
  );
}

const releaseReviewLiens: Lien[] = [];
for (let i = 0; i < 6; i++) {
  const billed = randomInt(rand, 2600, 28000);
  const payments = Math.round(billed * (0.6 + rand() * 0.22));
  const lien = buildLien(nextId(), {
    patient: nextPatientName(),
    stage: i < 4 ? "settled" : "paid",
    status: "release review",
    firm: pickOne(rand, FIRMS),
    billed,
    payments,
    deadline: rel(randomInt(rand, 1, 12)),
    paymentDate: rel(-randomInt(rand, 2, 18)),
    requested: null,
    lastContact: rel(-randomInt(rand, 1, 12)),
    settlement: randomInt(rand, 20000, 160000),
  });
  lien.requested_reduction = lien.lien_balance;
  releaseReviewLiens.push(lien);
}

const releasedLiens: Lien[] = [];
for (let i = 0; i < 14; i++) {
  const billed = randomInt(rand, 1800, 32000);
  const writeOff = Math.round(billed * (0.28 + rand() * 0.16));
  const payments = billed - writeOff;
  const release = rel(-randomInt(rand, 1, 30));
  const paymentDate = new Date(release.getTime() - randomInt(rand, 2, 9) * 86400000);
  const lien = buildLien(nextId(), {
    patient: nextPatientName(),
    stage: "paid",
    status: "released",
    firm: pickOne(rand, FIRMS),
    billed,
    payments,
    deadline: null,
    paymentDate,
    releaseDate: release,
    requested: null,
    lastContact: rel(-randomInt(rand, 20, 60)),
    settlement: randomInt(rand, 16000, 140000),
  });
  lien.requested_reduction = writeOff;
  lien.lien_balance = 0;
  releasedLiens.push(lien);
}

const stagePlan: CaseStage[] = [
  ...Array(62).fill("treating"),
  ...Array(26).fill("demand sent"),
  ...Array(12).fill("in litigation"),
  ...Array(5).fill("settled"),
  ...Array(4).fill("paid"),
];

const activeLiens: Lien[] = stagePlan.map((stage) => {
  const billed = randomInt(rand, 1800, 38000);
  const settled = stage === "settled" || stage === "paid";
  return buildLien(nextId(), {
    patient: nextPatientName(),
    stage,
    status: "active",
    firm: pickOne(rand, FIRMS),
    billed,
    payments: 0,
    deadline: settled ? rel(randomInt(rand, 1, 14)) : null,
    paymentDate: null,
    requested: null,
    lastContact: rel(-randomInt(rand, 1, 40)),
    settlement: settled ? randomInt(rand, 16000, 120000) : null,
  });
});

export const LIENS_SEED: Lien[] = [
  lien5208,
  lien5163,
  lien5137,
  ...discrepancyLiens,
  ...releaseReviewLiens,
  ...releasedLiens,
  ...activeLiens,
];

// A lien at the paid stage has had money posted against it. Fill in the
// payment the payment poster recorded for any paid-stage lien that would
// otherwise read $0, and move the balance down with it.
for (const lien of LIENS_SEED) {
  if (lien.case_stage === "paid" && lien.lien_status !== "released" && lien.payments_posted === 0) {
    lien.payments_posted = Math.round(lien.billed_total * (0.55 + rand() * 0.2));
    lien.lien_balance = Math.max(0, lien.billed_total - lien.payments_posted);
    lien.payment_posted_date = rel(-randomInt(rand, 1, 30));
  }
}

// Closing statements: one per settled or paid lien, with the first three
// slots held by the brief's named records so the demo always has them.
const settledPaid = [
  lien5208,
  lien5163,
  lien5137,
  ...discrepancyLiens,
  ...releaseReviewLiens,
  ...releasedLiens,
  ...activeLiens.filter((l) => l.case_stage === "settled" || l.case_stage === "paid"),
];

function statementFor(index: number, lien: Lien): ClosingStatement {
  const statementId = `CS-${lien.lien_id}`;
  const deadline = lien.disbursement_deadline ?? rel(randomInt(rand, 1, 14));

  if (index === 0) {
    return {
      statement_id: statementId,
      lien_id: lien.lien_id,
      patient_name: lien.patient_name,
      attorney_firm: lien.attorney_firm,
      received_date: rel(-1),
      gross_settlement: 48000,
      attorney_fee: 16000,
      case_costs: 2400,
      other_liens_total: 0,
      other_lien_types: "None",
      statement_lien_amount: 6200,
      proposal_amount: null,
      resolution_amount: null,
      resolution_status: "none on file",
      resolution_signed_date: null,
      net_to_client: 23400,
      match_status: "awaiting signed resolution",
      disbursement_deadline: deadline,
    };
  }

  if (index === 1) {
    return {
      statement_id: statementId,
      lien_id: lien.lien_id,
      patient_name: lien.patient_name,
      attorney_firm: lien.attorney_firm,
      received_date: rel(0, "07:55"),
      gross_settlement: 36000,
      attorney_fee: 12000,
      case_costs: 1850,
      other_liens_total: 2300,
      other_lien_types: "Health plan",
      statement_lien_amount: 4100,
      proposal_amount: null,
      resolution_amount: 4600,
      resolution_status: "signed",
      resolution_signed_date: rel(-9),
      net_to_client: 15750,
      match_status: "matches",
      disbursement_deadline: deadline,
    };
  }

  if (index === 2) {
    return {
      statement_id: statementId,
      lien_id: lien.lien_id,
      patient_name: lien.patient_name,
      attorney_firm: lien.attorney_firm,
      received_date: rel(-3),
      gross_settlement: 52000,
      attorney_fee: 17160,
      case_costs: 2100,
      other_liens_total: 0,
      other_lien_types: "None",
      statement_lien_amount: 9800,
      proposal_amount: 5900,
      resolution_amount: null,
      resolution_status: "proposal sent",
      resolution_signed_date: null,
      net_to_client: 22940,
      match_status: "awaiting signed resolution",
      disbursement_deadline: deadline,
    };
  }

  const balance = lien.lien_balance;
  const floor = lien.reduction_floor;
  const feeRate = 0.33 + rand() * 0.07;
  const costs = randomInt(rand, 400, 6000);
  const other = randomInt(rand, 0, 9000);
  const otherTypes =
    other === 0
      ? "None"
      : pickOne(rand, ["Health plan", "Medicare conditional payment", "Medicaid", "MedPay reimbursement"]);

  let resolutionStatus: ResolutionStatus;
  let matchStatus: MatchStatus;
  let statementAmount: number;
  let proposalAmount: number | null = null;
  let resolutionAmount: number | null = null;
  let signedDate: Date | null = null;

  if (index === 3) {
    resolutionAmount = Math.max(floor, Math.round(lien.billed_total * 0.62));
    statementAmount = Math.max(0, resolutionAmount - 500);
    resolutionStatus = "signed";
    matchStatus = "mismatch";
    signedDate = rel(-randomInt(rand, 5, 30));
  } else if (index === 4 || index === 5) {
    statementAmount = balance;
    proposalAmount = Math.min(balance, Math.max(floor, Math.round(balance * 0.7)));
    resolutionStatus = "proposal sent";
    matchStatus = "matches";
  } else if (index === 6) {
    statementAmount = Math.round(balance * 0.5);
    resolutionStatus = "none on file";
    matchStatus = "awaiting signed resolution";
  } else if (index === 7) {
    statementAmount = balance;
    resolutionStatus = "none on file";
    matchStatus = "matches";
  } else {
    resolutionAmount = Math.max(floor, Math.round(lien.billed_total * (0.6 + rand() * 0.15)));
    statementAmount = resolutionAmount;
    resolutionStatus = "signed";
    matchStatus = "matches";
    signedDate = rel(-randomInt(rand, 2, 30));
  }

  const gross = Math.max(
    24000 + randomInt(rand, 0, 196000),
    Math.ceil((statementAmount + costs + other + 5000) / (1 - feeRate))
  );
  const fee = Math.round(gross * feeRate);
  const net = gross - fee - costs - other - statementAmount;

  return {
    statement_id: statementId,
    lien_id: lien.lien_id,
    patient_name: lien.patient_name,
    attorney_firm: lien.attorney_firm,
    received_date: rel(-randomInt(rand, 0, 21)),
    gross_settlement: gross,
    attorney_fee: fee,
    case_costs: costs,
    other_liens_total: other,
    other_lien_types: otherTypes,
    statement_lien_amount: statementAmount,
    proposal_amount: proposalAmount,
    resolution_amount: resolutionAmount,
    resolution_status: resolutionStatus,
    resolution_signed_date: signedDate,
    net_to_client: net,
    match_status: matchStatus,
    disbursement_deadline: deadline,
  };
}

export const STATEMENTS_SEED: ClosingStatement[] = settledPaid
  .slice(0, 30)
  .map((lien, i) => statementFor(i, lien));

// Payments: one row for 5208 (the brief's payment), and two to three split
// rows for every other lien that has money posted.
const payingLiens = LIENS_SEED.filter((l) => l.payments_posted > 0 && l.lien_id !== "5208");
const paymentCounts = payingLiens.map(() => 2);
let paymentTotal = 1 + paymentCounts.length * 2;
let assignCursor = 0;
while (paymentTotal < 70 && paymentCounts.length > 0) {
  paymentCounts[assignCursor % paymentCounts.length] += 1;
  paymentTotal += 1;
  assignCursor += 1;
}
while (paymentTotal > 70) {
  const reduceAt = paymentCounts.findIndex((c) => c > 1);
  if (reduceAt < 0) break;
  paymentCounts[reduceAt] -= 1;
  paymentTotal -= 1;
}

export const PAYMENTS_SEED: Payment[] = [
  {
    payment_id: "PM-5208-1",
    lien_id: "5208",
    payer: "Fenwright & Sallow Injury Law trust account",
    amount: 6200,
    posted_date: rel(-1),
    check_number: "48217",
    posted_by: "Renata Ilves",
  },
];

payingLiens.forEach((lien, i) => {
  const parts = paymentCounts[i];
  const base = lien.payment_posted_date ?? rel(-10);
  let remaining = lien.payments_posted;
  for (let k = 0; k < parts; k++) {
    const amount = k === parts - 1 ? remaining : Math.floor(lien.payments_posted / parts);
    remaining -= amount;
    const posted = new Date(base.getTime() - k * randomInt(rand, 1, 5) * 86400000);
    PAYMENTS_SEED.push({
      payment_id: `PM-${lien.lien_id}-${k + 1}`,
      lien_id: lien.lien_id,
      payer: lien.lien_holder === FUNDER ? FUNDER : `${lien.attorney_firm} trust account`,
      amount,
      posted_date: posted,
      check_number: String(randomInt(rand, 10000, 99999)),
      posted_by: "Renata Ilves",
    });
  }
});

// Notes: 5208 and 5163 get the brief's exact notes; other liens get two or
// three from the life of a lien, for 320 in total.
export const NOTES_SEED: LienNote[] = [];
let noteSeq = 1;
function addNote(lienId: string, author: string, timestamp: Date, text: string) {
  NOTES_SEED.push({
    note_id: `LN-${noteSeq++}`,
    lien_id: lienId,
    author,
    timestamp,
    note_text: text,
  });
}

addNote("5208", "Joaquin Reyes", rel(-400), "LOP signed by the patient and received from Fenwright & Sallow Injury Law.");
addNote("5208", "Marcus Odum", rel(-45), "Itemized balance of $11,400 sent to the firm.");
addNote("5208", "Renata Ilves", rel(-1, "09:10"), "Settlement check for $6,200 from Fenwright & Sallow's trust account posted by the payment poster.");
addNote("5208", "Marcus Odum", rel(-1, "16:40"), "Settlement notice by email, attorney says lien reduced, no agreement found.");
addNote("5163", "Joaquin Reyes", rel(-300), "LOP signed and received from Marrow Creek Trial Lawyers.");
addNote("5163", "Marcus Odum", rel(-9), "Signed lien resolution received at $4,600.");
addNote("5163", "Marcus Odum", rel(0, "07:55"), "Draft closing statement received by email.");

const NOTE_TEXTS = [
  "LOP signed and returned by the firm.",
  "Itemized balance sent to the attorney.",
  "Demand sent by the attorney.",
  "Settlement notice received by email.",
  "Reduction proposal sent to the attorney.",
  "Signed resolution received.",
  "Payment posted by the payment poster.",
  "Lien release sent to the firm.",
];

const otherLiens = LIENS_SEED.filter((l) => l.lien_id !== "5208" && l.lien_id !== "5163");
otherLiens.forEach((lien, i) => {
  addNote(lien.lien_id, STAFF[i % STAFF.length], rel(-randomInt(rand, 60, 180)), NOTE_TEXTS[i % NOTE_TEXTS.length]);
  addNote(lien.lien_id, STAFF[(i + 1) % STAFF.length], rel(-randomInt(rand, 1, 45)), NOTE_TEXTS[(i + 3) % NOTE_TEXTS.length]);
});
otherLiens.slice(0, 38).forEach((lien, i) => {
  addNote(lien.lien_id, STAFF[(i + 2) % STAFF.length], rel(-randomInt(rand, 1, 60)), NOTE_TEXTS[(i + 5) % NOTE_TEXTS.length]);
});

// Itemized services for a lien's ledger: three or four dated lines whose
// amounts add up exactly to the billed total.
export interface ServiceLine {
  line_id: string;
  service_date: Date;
  code: string;
  label: string;
  amount: number;
}

const SPINE_CODES = ["64483", "97110", "72148", "20610"];
const SHOULDER_CODES = ["73030", "20610", "97110"];
const KNEE_CODES = ["73721", "29881", "20610", "97110"];
const codeLabel = (code: string): string =>
  CPT_CODES.find((c) => c.code === code)?.label ?? "Office visit";
function codesFor(injury: string): string[] {
  if (/cervical|lumbar|spine|radiculopathy|thoracic/i.test(injury)) return SPINE_CODES;
  if (/rotator|shoulder/i.test(injury)) return SHOULDER_CODES;
  if (/knee|meniscal/i.test(injury)) return KNEE_CODES;
  return CPT_CODES.map((c) => c.code);
}

export const SERVICE_LINES_SEED: Record<string, ServiceLine[]> = {};
for (const lien of LIENS_SEED) {
  const parts = 3 + randomInt(rand, 0, 1);
  const weights = Array.from({ length: parts }, () => 0.6 + rand());
  const weightTotal = weights.reduce((sum, w) => sum + w, 0);
  const amounts = weights.map((w) => Math.floor((lien.billed_total * w) / weightTotal));
  amounts[parts - 1] = lien.billed_total - amounts.slice(0, -1).reduce((sum, a) => sum + a, 0);
  const sinceInjury = Math.max(
    30,
    Math.round((Date.now() - new Date(lien.date_of_injury).getTime()) / 86400000)
  );
  const pool = codesFor(lien.injury_type);
  SERVICE_LINES_SEED[lien.lien_id] = amounts.map((amount, i) => {
    const code = pool[randomInt(rand, 0, pool.length - 1)];
    return {
      line_id: `SV-${lien.lien_id}-${i + 1}`,
      service_date: rel(-randomInt(rand, 1, Math.min(sinceInjury, 240))),
      code,
      label: codeLabel(code),
      amount,
    };
  });
}

// Plain-language labels and number formatting shared by the screens.
export function daysLabel(days: number): string {
  return days === 1 ? "1 business day" : `${days} business days`;
}

export function usd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function usdCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function stageLabel(stage: CaseStage): string {
  const labels: Record<CaseStage, string> = {
    treating: "Treating",
    "demand sent": "Demand sent",
    "in litigation": "In litigation",
    settled: "Settled",
    paid: "Paid",
  };
  return labels[stage];
}

export function statusLabel(status: LienStatus): string {
  const labels: Record<LienStatus, string> = {
    active: "Active",
    discrepancy: "Discrepancy",
    "release review": "Release review",
    released: "Released",
  };
  return labels[status];
}

// The architecture is the brief's own node/edge data, passed through whole.
export const ARCHITECTURE: { nodes: ArchNode[]; edges: ArchEdge[]; compliance_notes: string[] } = {
  nodes: [
    {
      id: "attorney-inbox",
      label: "Law firm email and fax inbox",
      kind: "system",
      does: "Receives settlement notices, closing statements, reduction requests, signed resolutions and release requests from law firms.",
      data: "Settlement letters, draft closing statements, reduction requests, signed resolutions",
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
      does: "Matches each settlement, closing statement and payment to the lien ledger and signed resolution, flags mismatches and holds releases for approval. In this demo it runs in your browser with synthetic data.",
      data: "Lien status, balances, resolution amounts, discrepancy reasons, deadlines",
      stores_patient_data: true,
      runs_in: "client-cloud",
    },
    {
      id: "document-reader",
      label: "Document reader (AI)",
      kind: "model",
      does: "Reads settlement letters, reduction requests and closing statements for the amounts, the firm and the deadline.",
      data: "Letter and statement text only, no chart data",
      stores_patient_data: false,
      runs_in: "client-cloud",
    },
    {
      id: "letter-templates",
      label: "Release letter templates (Microsoft Office)",
      kind: "system",
      does: "Fills the practice's reduction proposal and lien release letters with the approved amounts.",
      data: "Patient name, firm, proposed or approved amount",
      stores_patient_data: false,
      runs_in: "vendor-system",
    },
    {
      id: "coordinator",
      label: "Marcus (lien and LOP coordinator)",
      kind: "human",
      does: "Reviews closing statements and discrepancies, sends reduction proposals, and approves every reduction and release.",
      data: "Everything in the desk for his liens",
      stores_patient_data: false,
      runs_in: "person",
    },
    {
      id: "law-firms",
      label: "Referring law firms",
      kind: "external",
      does: "Send settlement notices, closing statements and payments, sign reduction proposals, and receive signed releases.",
      data: "Balances, proposals and release letters only",
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
    { from: "attorney-inbox", to: "lien-desk", label: "Settlement letters and closing statements" },
    { from: "ehr-ledger", to: "lien-desk", label: "Charges and payments posted" },
    { from: "lien-desk", to: "document-reader", label: "Letter and statement text" },
    { from: "document-reader", to: "lien-desk", label: "Amounts, firm, deadline" },
    { from: "lien-desk", to: "coordinator", label: "Statement mismatches, discrepancies and releases to approve" },
    { from: "coordinator", to: "letter-templates", label: "Proposal or approved release" },
    { from: "letter-templates", to: "law-firms", label: "Reduction proposal or signed lien release" },
    { from: "lien-desk", to: "funder", label: "Status on purchased liens" },
  ],
  compliance_notes: [
    "A real build runs in the practice's own cloud account, with access limited by role and every action logged.",
    "The document reader sees letter and statement text only, never the chart, and patient data is never sent to a model without a signed BAA.",
    "Law firms and the funder receive balances, proposals and releases only, never clinical details.",
    "The desk never moves money: it flags mismatches, and every reduction and release waits for the coordinator's approval.",
    "This prototype uses synthetic data and simulated roles.",
  ],
};
