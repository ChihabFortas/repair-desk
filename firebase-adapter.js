// Connects the app to Firebase (Google sign-in + Firestore).
// It exposes the same tiny API the app already uses (db + user), so app.js is unchanged.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { FIREBASE_CONFIG, OWNER_EMAILS, APP_VERSION } from "./firebase-config.js";

const $ = s => document.querySelector(s);
$("#ver").textContent = "Repair Desk · v" + APP_VERSION;
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const fs = initializeFirestore(app, { localCache: persistentLocalCache() });
const owners = OWNER_EMAILS.map(e => e.toLowerCase());
let started = false;

function build(email) {
  const q = r => ({
    orderBy: (f, d) => q(query(r, orderBy(f, d || "asc"))),
    limit: n => q(query(r, limit(n))),
    onSnapshot: (ok, er) => onSnapshot(r, ok, er)
  });
  // Only admins may list all roles; everyone else just reads their own role document.
  const rolesQ = {
    onSnapshot: (ok, er) => {
      let u2 = null;
      const u1 = onSnapshot(collection(fs, "roles"), ok, e => {
        if (e.code === "permission-denied") {
          u2 = onSnapshot(doc(fs, "roles", email),
            d => ok({ docs: [{ id: email, data: () => (d.exists() ? d.data() : { role: "none" }) }] }), er);
        } else if (er) er(e);
      });
      return () => { u1(); if (u2) u2(); };
    }
  };
  const db = {
    collection: p => (p === "roles" ? rolesQ : q(collection(fs, p))),
    doc: p => { const r = doc(fs, p); return { set: o => setDoc(r, o), update: o => updateDoc(r, o), delete: () => deleteDoc(r) }; }
  };
  const user = { id: async () => email, isOwner: async () => owners.includes(email) };
  return { db, user };
}

function start(u) {
  const email = (u.email || "").toLowerCase();
  const api = build(email);
  window.claude = { use: async n => (n === "db" ? api.db : api.user) };
  $("#login").style.display = "none";
  if (started) return;
  started = true;
  const s = document.createElement("script");
  s.src = "app.js?t=" + Math.floor(Date.now() / 6e5); // picks up updates within ~10 minutes
  s.onload = () => {
    const b = document.createElement("button");
    b.textContent = "Sign out";
    b.onclick = async () => { await signOut(auth); location.reload(); };
    const top = document.querySelector(".w>.top");
    top.insertBefore(b, $("#lang"));
  };
  document.body.appendChild(s);
}

$("#gbtn").onclick = async () => {
  const p = new GoogleAuthProvider();
  try { await signInWithPopup(auth, p); }
  catch (e) {
    if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") signInWithRedirect(auth, p);
    else $("#lerr").textContent = e.code || String(e);
  }
};
onAuthStateChanged(auth, u => { if (u) start(u); else $("#login").style.display = "block"; });
