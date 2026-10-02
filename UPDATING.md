# Updating the app (no Firebase steps, no re-setup)

Your settings live only in `firebase-config.js`. Updates replace `app.js` and sometimes `index.html`, so you never redo the setup.

## Easiest: GitHub website (works from a phone)
1. Open the repository → click the file (`app.js` or `index.html`) → pencil icon (Edit) → select all, paste the new content → **Commit changes**.
   Or: Add file → Upload files → drop the new `app.js` / `index.html` (same names, they overwrite) → Commit.
2. GitHub Pages republishes in ~1 minute. Users get the new `app.js` within ~10 minutes (or reload).

## With git
```
git pull
# copy the new app.js / index.html over the old ones
git add -A && git commit -m "update" && git push
```

## Rules changes
Only when the release notes in `CHANGELOG.md` say "rules changed": Firebase console → Firestore → Rules → paste the new `firestore.rules` → Publish.

## Rollback
Repository → History of the file → pick the previous commit → "Revert".

## Never overwrite
`firebase-config.js` (your settings). Your data lives in Firebase, so updating files never touches it.
