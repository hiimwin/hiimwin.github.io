import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
getAuth, onAuthStateChanged, signInAnonymously, signOut,
GoogleAuthProvider, signInWithPopup, linkWithPopup,
signInWithRedirect, linkWithRedirect, getRedirectResult, signInWithCredential
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
let daHoiKhach = false;
onAuthStateChanged(auth, u => {
const truoc = uid;
user = u || null;
uid = u ? u.uid : null;
if (uid) settle(namespace());
if (!daHoiKhach) {
daHoiKhach = true;
if (!u) signInAnonymously(auth).catch(e => {
console.warn("[nga] Không bật được tài khoản khách:", e.code || e);
settle(null);
});
}
if (settled && truoc && uid && uid !== truoc && typeof window.CLOUD_CHANGED === "function") {
window.CLOUD_CHANGED();
}
});
const DAU_DN = "nga:dangdangnhap";
function datDau() { try { sessionStorage.setItem(DAU_DN, "1"); } catch (e) {} }
function layDau() {
try { const v = sessionStorage.getItem(DAU_DN); sessionStorage.removeItem(DAU_DN); return v === "1"; }
catch (e) { return false; }
}
function bao(m) { if (typeof window.CLOUD_FLASH === "function") window.CLOUD_FLASH(m); }
function doi() { if (typeof window.CLOUD_CHANGED === "function") window.CLOUD_CHANGED(); }
getRedirectResult(auth).then(res => {
const quayVe = layDau();
if (res && res.user) {
if (quayVe) bao("Đã đăng nhập. Tiến độ từ giờ được đồng bộ.");
doi();
return;
}
if (quayVe) setTimeout(() => {
const u = auth.currentUser;
if (!u || u.isAnonymous) bao("Google báo đăng nhập xong nhưng trình duyệt chặn bước cuối. Tiến độ vẫn được lưu trên máy này như thường.");
}, 2500);
}).catch(async e => {
layDau();
const code = (e && e.code) || "";
if (/already-in-use|credential-already/.test(code)) {
const cred = GoogleAuthProvider.credentialFromError(e);
if (cred) {
try {
await signInWithCredential(auth, cred);
bao("Đã đăng nhập. Tiến độ hai bên sẽ được gộp lại.");
doi();
return;
} catch (e2) { console.warn("[nga] gộp tài khoản hỏng:", (e2 && e2.code) || e2); }
}
}
console.warn("[nga] đăng nhập chuyển hướng hỏng:", code || e);
bao("Không đăng nhập được" + (code ? " (" + code + ")" : "."));
});
function nenChuyenHuong() {
const ua = navigator.userAgent || "";
const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const safari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|Edg\/|Android|OPR/.test(ua);
return ios || safari;
}
function hopBiChan(e) {
return /popup-blocked|operation-not-supported-in-this-environment|web-storage-unsupported/.test((e && e.code) || "");
}
async function dangNhapGoogle(kieu) {
const provider = new GoogleAuthProvider();
const khach = auth.currentUser && auth.currentUser.isAnonymous;
if (kieu === "huong") {
datDau();
if (khach) await linkWithRedirect(auth.currentUser, provider);
else await signInWithRedirect(auth, provider);
return;
}
if (khach) await linkWithPopup(auth.currentUser, provider);
else await signInWithPopup(auth, provider);
}
setTimeout(() => settle(null), 15000);
window.CLOUD = {
ready: () => readyP,
state: () => ({ uid, user }),
async signInGoogle() {
if (nenChuyenHuong()) { await dangNhapGoogle("huong"); return; }
try {
await dangNhapGoogle("hop");
} catch (e) {
const code = (e && e.code) || "";
if (/already-in-use|credential-already/.test(code)) {
await signInWithPopup(auth, new GoogleAuthProvider());
} else if (hopBiChan(e)) {
await dangNhapGoogle("huong");
return;
} else throw e;
}
doi();
},
async signOutNow() {
await signOut(auth);
await signInAnonymously(auth).catch(() => {});
if (typeof window.CLOUD_CHANGED === "function") window.CLOUD_CHANGED();
}
};
if (typeof window.CLOUD_CHANGED === "function") window.CLOUD_CHANGED();
}