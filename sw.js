const CACHE = "nga-v97";
const SHELL = ["./", "./index.html", "./fonts.css", "./manifest.json", "./icon.svg"];
self.addEventListener("install", e => {
e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
e.waitUntil(
caches.keys()
.then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
.then(() => self.clients.claim())
);
});
self.addEventListener("fetch", e => {
const req = e.request;
if (req.method !== "GET") return;
const url = new URL(req.url);
if (url.pathname.indexOf("/__/") === 0) return;
if (/googleapis\.com|identitytoolkit|firebaseio|accounts\.google\.com|gstatic\.com\/firebasejs/.test(url.href)) return;
const isPage = req.mode === "navigate" || (req.destination === "document");
if (isPage) {
e.respondWith(
fetch(req)
.then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return r; })
.catch(() => caches.match("./index.html"))
);
return;
}
e.respondWith(
caches.match(req).then(hit => hit || fetch(req).then(r => {
if (r.ok && (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com/.test(url.host))) {
const copy = r.clone();
caches.open(CACHE).then(c => c.put(req, copy));
}
return r;
}).catch(() => hit || new Response("", { status: 504, statusText: "offline" })))
);
});