import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
getAuth, onAuthStateChanged, signInAnonymously, signOut,
GoogleAuthProvider, signInWithPopup, linkWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
const cfg = window.FIREBASE_CONFIG;
if (!cfg || !cfg.apiKey || /DÁN|PASTE|XXX/.test(cfg.apiKey)) {
console.warn("[nga] Chưa điền firebase-config.js — app chạy offline, tiến độ chỉ lưu trong trình duyệt.");
} else {
const app = initializeApp(cfg);
const auth = getAuth(app);
const fs = getFirestore(app);
let uid = null, user = null, settled = false, resolveReady;
const readyP = new Promise(r => { resolveReady = r; });
function namespace() {
return {
doc(path) {
const parts = String(path).split("/").filter(Boolean);
const ref = doc(fs, "users", uid, ...parts);
return {
async get() {
const snap = await getDoc(ref);
return { exists: snap.exists(), data: () => snap.data() };
},
async set(value) {
await setDoc(ref, JSON.parse(JSON.stringify(value)));
}
};
}
};
}
function settle(value) {
if (settled) return;
settled = true;
resolveReady(value);
}
onAuthStateChanged(auth, u => {
const truoc = uid;
user = u || null;
uid = u ? u.uid : null;
if (uid) settle(namespace());
if (settled && truoc && uid && uid !== truoc && typeof window.CLOUD_CHANGED === "function") {
window.CLOUD_CHANGED();
}
});
signInAnonymously(auth).catch(e => {
console.warn("[nga] Không bật được tài khoản khách:", e.code || e);
settle(null);
});
setTimeout(() => settle(null), 15000);
window.CLOUD = {
ready: () => readyP,
state: () => ({ uid, user }),
async signInGoogle() {
const provider = new GoogleAuthProvider();
try {
if (auth.currentUser && auth.currentUser.isAnonymous) {
await linkWithPopup(auth.currentUser, provider);
} else {
await signInWithPopup(auth, provider);
}
} catch (e) {
if (e && /already-in-use|credential-already/.test(e.code || "")) {
await signInWithPopup(auth, provider);
} else throw e;
}
if (typeof window.CLOUD_CHANGED === "function") window.CLOUD_CHANGED();
},
async signOutNow() {
await signOut(auth);
await signInAnonymously(auth).catch(() => {});
if (typeof window.CLOUD_CHANGED === "function") window.CLOUD_CHANGED();
}
};
if (typeof window.CLOUD_CHANGED === "function") window.CLOUD_CHANGED();
}