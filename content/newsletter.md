# Catching the short check before the lien release goes out

Settlement notices, reduction requests and release requests reach injury practices by email and fax. The lien coordinator matches each one to the EHR ledger, compares the posted check with the billed total, works out whether a reduction was agreed and types the release letter. Status lives in a spreadsheet and an inbox.

At about 40 minutes per settled lien and 30 liens a week, that is roughly 20 coordinator hours a week. Short payments are often found after the release letter has gone out. A release sent against a $6,200 check on an $11,400 bill writes off $5,200 that nobody approved. Liens sold to a funder get released without the funder's sign-off.

It keeps happening because nobody has one list of which settled liens are paid in full, short-paid or still waiting on a check.

## What the prototype does

We built a lien desk for a fictional four-clinic injury practice. Liens shows every lien with its attorney, lien holder, billed total, payments posted and balance, settled ones first. Click a row to open its ledger and full history.

Discrepancies holds settled liens that do not match the ledger. At the top is lien 5208: a $6,200 check posted against an $11,400 bill, flagged "Payment short of balance, no reduction on file", with a countdown to the firm's disbursement deadline 3 days out. You attach the attorney's reduction letter (a sample is included). The desk matches it to the lien and notes the $6,200 offer is above the practice's $6,000 floor. Then you move it to release review.

Release review is the human checkpoint. No balance is written off and no release letter goes to a law firm until the coordinator clicks "Approve and send release".

A role switcher shows what Billing and the attorney's view cannot see. A cost calculator takes your own lien volume and coordinator rate. A clickable "How it works" diagram shows which pieces hold patient data.

## How a real version would be built

A production desk would read charges and posted payments from the practice's EHR and billing ledger, pull letters from the law firm inbox and fill the practice's Microsoft Office release letter templates. It would run on the practice's own Google Cloud account with role-based access, audit logs, encryption and BAAs with every vendor that touches patient data.

This is a concept prototype with synthetic data. A real build runs on the practice's own cloud, HIPAA-ready, and the practice owns it.

If your team fights this every week, book a free workflow audit at umakes.cloud or reply to umakescloud@gmail.com.
