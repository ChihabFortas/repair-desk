# Printing (Citizen CT-S300II + label tickets)

What prints (Case file > Print box):
- **Receipt** (reception): customer copy, 72 mm printable width on the 80 mm roll, with case barcode, QR code to the tracking page, dates, device, problem.
- **Ticket** (reception / technician): barcode label for the phone or the form. Sizes 35x20, 45x35 and 57x45 mm, 1-3 copies.
- **Quote** (technician / manager): only for out-of-warranty cases (labor + parts + total + signature line). Under warranty the button is disabled.
- **Return receipt** (reception): everything that happened in the workshop, price/paid/balance, journey with dates, tracking QR.
After a case is created the app offers to print the receipt and the ticket; after "Return to customer" it offers the return receipt.

## One-time printer setup (Windows, on the reception PC, with Chrome or Edge)
1. Printer Properties > Preferences > Paper: create custom paper sizes: `80 mm x Receipt (roll)`, `35 x 20 mm`, `45 x 35 mm`, `57 x 45 mm`. Set margins to 0.
2. In the browser print window: Destination = your Citizen printer, Margins = None, untick "Headers and footers", Scale 100%.
3. For tickets choose the matching custom paper size once; the browser remembers it. The app asks the browser for the exact label size.
4. Receipts are printed with the browser's paper size for the printer; use the 80 mm roll size so the paper is cut after the last line.

## Tracking page
`track.html` (same folder as index.html) is what the QR code opens, e.g. `https://USER.github.io/repair-desk/track.html?t=CODE`. Customers can also type their tracking code or phone number. Settings > Workshop settings lets admin set the shop phone, receipt footer note, receipt language, and an optional custom tracking page address.

## Notes
- Barcodes and QR codes are drawn with two small libraries loaded from cdnjs, so the reception PC needs internet the first time.
- Printing needs the app opened in a normal browser tab (GitHub Pages). It may be blocked inside embedded previews.
- The tracking QR only works when the app is hosted on GitHub Pages (a public address).
