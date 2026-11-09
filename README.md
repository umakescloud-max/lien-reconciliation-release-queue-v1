# Lien reconciliation and release desk for an injury practice

Every settled injury lien is checked against what was paid and what the closing statement says, before any lien release goes out.

## What's new

The desk now has a closing desk. When a law firm sends its draft final closing statement, you see it next to the practice's ledger balance, reduction floor and signed lien resolution, along with the days left before the firm disburses. You can flag a mismatch to Discrepancies before the money goes out. To try it, open lien 5163: the statement lists $4,100 for the practice, but the signed resolution says $4,600.

![Lien reconciliation and release desk for an injury practice](cover.png)

## Who has this problem

Injury-first practices: orthopedics, spine, interventional pain, physiatry and physical therapy, paid mostly through PIP, letters of protection and workers' comp. Picture a practice with four clinics, about 1,900 active injury cases and about 30 settled liens to reconcile and release each week.

That work usually falls to one lien and LOP coordinator. Settlement notices, reduction requests, closing statements and release requests arrive by email and fax. The coordinator matches each one to the patient ledger in the EHR, compares the posted check with the billed total, works out whether a reduction was agreed, and types the release letter from a Word template. Status lives in a spreadsheet and an inbox.

What goes wrong:

- No single list shows which settled liens are paid in full, short-paid or still waiting on a check.
- Short payments are found after the release letter has gone out, so the difference gets written off without anyone approving it.
- Liens sold to a funder are sometimes released without the funder's sign-off.
- A closing statement can list less for the practice than the signed lien resolution, and nobody notices until the firm has disbursed.
- Attorneys wait days for a release and call to ask, which strains the referral relationship.

At about 40 minutes per settled lien and 30 liens a week, that is roughly 20 coordinator hours a week. One release sent against a $6,200 check on an $11,400 bill writes off $5,200 that nobody approved.

## What you can try

The Start here screen lists four tasks. Each one ticks Done when you finish it.

- **Check a closing statement:** on Closing statements, open lien 5163 and click Flag statement mismatch. The firm's draft lists $4,100 for the practice against a signed resolution of $4,600, so the lien goes to Discrepancies with its disbursement countdown.
- **Fix the short-paid lien:** on Discrepancies, open lien 5208 (a $6,200 check on an $11,400 bill, no reduction on file) and attach the attorney's reduction letter. The reason changes to "Reduction requested, within floor".
- **Send it to release review:** still on lien 5208, click Move to release review.
- **Approve the release:** on Release review, check lien 5208's ledger, payment and reduction against the practice's $6,000 floor, then click Approve and send release.

Also in the demo:

- **Sample documents:** the attorney's reduction request for lien 5208 and the draft closing statement for lien 5163. Download one and drop it in, or click to use it directly.
- **Role switcher:** view the desk as the lien coordinator, as Billing (treatment summary hidden) or as the attorney (treatment summary and reduction floor hidden).
- **Cost calculator:** enter your own settled-lien volume, minutes per lien and coordinator rate to compare today's time with the desk.
- **How it works:** a clickable diagram. Click any box to see what it does, what data passes through it and whether it holds patient data.

A guided tour walks through every screen, starting with Marcus, a fictional lien coordinator, and his Tuesday before and after the desk.

## How it's built

This is a browser-only React + TypeScript + Tailwind app built on the Umakes kit. It runs on synthetic seed data: 140 liens, 70 payments, 30 draft closing statements and 320 lien notes, all invented. The Liens screen computes its metrics from that data: open lien balance, discrepancies due in 5 days, releases waiting on approval, and average days from payment to release.

The Umakes App Factory built and checked it. Automated gates ran first, then a reviewer used the app the way a first-time visitor would and reported what worked and what did not.

The How it works screen shows the architecture: the law firm inbox and the EHR ledger feed the lien desk, a document reader pulls amounts, firm and deadline from letters and statements, the coordinator approves, and the release letter goes out to the law firm.

## What a production version adds

- **Real integrations:** the practice's EHR and billing ledger for charges and posted payments, the law firm email and fax inbox, an AI document reader for settlement letters, reduction requests and closing statements, Microsoft Office templates for reduction proposals and release letters, and status updates to the lien funder on purchased liens.
- **HIPAA controls:** role-based access, audit logs on every action, encryption in transit and at rest, and signed BAAs with every vendor that touches patient data. The document reader sees letter and statement text only, never the chart.
- **Deployment on the client's own cloud:** it runs in the practice's own GCP account.
- **Client ownership:** the practice owns the code, the data and the deployment.
- **No money moves on its own:** the desk flags mismatches, and every reduction and release waits for the coordinator's approval.

## Try it

https://umakescloud-max.github.io/lien-reconciliation-release-queue-v1/

This is a concept prototype built on synthetic data. No real patients, practices or law firms are in it. A real build runs on the client's own cloud, HIPAA-ready, and the client owns it.

If your team fights this every week, book a free workflow audit at umakes.cloud or reply to umakescloud@gmail.com.
