# Database structure (Cloud Firestore)

Four collections. No indexes needed.

## `cases/{caseNo}`  — one document per phone/tablet (id = case number in lowercase, e.g. `r261001-123`)
| field | type | notes |
|---|---|---|
| caseNo, customer, phone, model, imei, problem | string | intake data (`email` exists only on older cases) |
| type | string | `Phone` / `Tablet` |
| openedAt | string | `YYYY-MM-DD` date received |
| status | string | `waiting` `repairing` `repaired` `swap_todo` `swap_sent` `swap_done` `delivered` `archived` |
| loc | string | custody: `reception` `to_ws` `workshop` `to_rec` `customer` |
| warranty | string | `in` (default) / `out` |
| warrantyLog | array | `{from,to,reason,at,by,role}` |
| photo, photoDone | string | reception photo / after-repair photo (JPEG data URL) |
| repairInfo, parts, cost, tech | string | repair notes |
| startedAt, repairedAt, returnDate | string | dates |
| outcome | string | `success` / `unrepairable` / empty |
| charge | number | price for out-of-warranty repairs |
| swapAt, swapReason, sentAt, swapRef, swappedAt, newModel, newImei | string | swap workflow |
| track | array | `{k,at(ms),by,role}` custody events |
| history | array | text log lines |

## Clients (admin, manager, cashier, reception)
- `clients/{autoId}`: `name, phone, email, notes, date, at, by`. Cases link by `cases.clientId` (older cases match by phone number).
- `acctx/{autoId}` append-only account ledger: `clientId, type (topup|withdraw|apply), amount, caseId, caseNo, date, at, by, who, note`. Balance = topups - withdrawals - applied payments.
- `payments` also has `src` (`cash` or `account`) and `clientId`.

## Inventory (admin, manager, technician)
- `grn/{grn-YYMM-NNN}` receiving note: `no, date, status (draft|confirmed), lines [{name, qty, unit}], by, confirmedAt, confirmedBy`. Confirmed notes are locked.
- `parts/{noteId-lineIndex}` part lot created when a note is confirmed: `name, qtyIn, unitCost, noteId, noteNo, date, by`.
- `stockmoves/{autoId}` append-only: `partId, k (consume|defect|defect_case|sendback), qty, caseId, caseNo, date, at, by, who, note`.
- Stock is computed: good = qtyIn - consume - defect; consumed = consume - defect_case; defective = defect + defect_case - sendback; sent back = sendback.
- `cases.partLines [{mid, partId, name, qty, unit, at, by}]` and `cases.partsTotal` (added to the repair price; total due = charge + partsTotal).

## `payments/{autoId}` — cash received (the customer account is computed from these + `cases.charge`)
`caseId, caseNo, customer, phone, ck (customer key), amount (number), date, by (role), note, at (ms)`

## `roles/{googleEmailLowercase}`
`role` = `admin` `reception` `technician` `manager` `cashier` `guest` `blocked`, `label` = display name.
Owners in `OWNER_EMAILS` are admin without a document.

## `audit/{autoId}` — append-only log
`at (ms), uid (email), who, role, action, target, detail`

## Who can do what (enforced in `firestore.rules`)
- Create case: admin, reception. Delete case/payment: admin.
- Repair fields, warranty, after-repair photo: technician, admin.
- Custody (`loc`, `track`) and return date: reception, technician, admin.
- Price (`charge`): admin, manager, cashier, technician. Record payments: admin, manager, cashier.
- Audit log: written by staff, read by admin only, never editable.
- Guests: read cases only. No role = no access.
