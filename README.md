# Repair Desk — setup guide (Firebase + GitHub Pages)

A static web app (no server to run). Hosting = GitHub Pages (free). Database + Google sign-in = Firebase (free Spark plan).

Files
- `index.html`  page + styling          - `app.js`  all the app logic
- `firebase-adapter.js`  Google sign-in + database connection
- `firebase-config.js`   YOUR settings (the only file you edit once)
- `firestore.rules`      server-side security (paste into Firebase)
- `DATABASE.md` data structure · `UPDATING.md` how to ship updates

## Part 1 — Firebase (once, ~10 min)
1. https://console.firebase.google.com → Add project (analytics not needed).
2. Build → Authentication → Get started → Sign-in method → **Google** → Enable → Save.
3. Authentication → Settings → Authorized domains → Add `YOUR-GITHUB-USERNAME.github.io`.
4. Build → Firestore Database → Create database → **Production mode** → pick the region closest to you.
5. Firestore → Rules tab → paste all of `firestore.rules` → replace `owner@example.com` with your Google email → Publish.
6. Project settings (gear) → Your apps → Web `</>` → register → copy the `firebaseConfig` values into `firebase-config.js`.
7. In `firebase-config.js` set `OWNER_EMAILS` to the same email as in the rules.

## Part 2 — GitHub (once, ~5 min)
1. github.com → New repository → name `repair-desk` → Public → Create. (Pages on private repos needs a paid plan. The code is public, the data is not: it is protected by the rules + sign-in.)
2. Upload the files: repository page → Add file → Upload files → drag ALL files from this folder → Commit.
   (Command line alternative: `git init && git add . && git commit -m "v10" && git branch -M main && git remote add origin https://github.com/USER/repair-desk.git && git push -u origin main`)
3. Settings → Pages → Source: **Deploy from a branch** → Branch `main`, folder `/ (root)` → Save.
4. After ~1 minute the app is live at `https://USER.github.io/repair-desk/`.

## Part 3 — First use
1. Open the link on your phone, tap **Sign in with Google** with the owner email. You are Admin.
2. Users → type each staff member's **Google email** (lowercase) + role → Save role. Roles: Reception team, Repair technician, Manager, Cashier, Admin, Suspended.
3. Anyone signed in who has no role sees "No access". Add the email as `guest` for view-only.
4. Tap your role badge at the top to see your sign-in ID (your email).
5. Camera/gallery buttons work in the phone browser (HTTPS is required — GitHub Pages provides it).

## Good to know
- Free limits (Spark): 50k reads / 20k writes per day, 1 GiB — plenty for one workshop.
- Photos are compressed (~720 px) and stored inside each case document (limit 1 MiB per case).
- Backups: Firestore console → Import/Export (needs the pay-as-you-go plan), or ask for a CSV-export button.
- Security: sign-in is Google; roles are enforced by `firestore.rules` on the server (not just by the screen).
