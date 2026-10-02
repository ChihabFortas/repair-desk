// ===== The ONLY file with your own settings. Updates never overwrite it. =====
// Paste the config from Firebase console > Project settings > Your apps > Web app.
// (These values are public identifiers; security comes from firestore.rules.)
export const FIREBASE_CONFIG = {
  apiKey: "PASTE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE",
  appId: "PASTE"
};

// Google emails that are always Admin (the owner). Must match firestore.rules.
export const OWNER_EMAILS = ["owner@example.com"];

export const APP_VERSION = "10";
