/* Chặn tệp lạ trong thư mục này — mọi thứ nằm ở đây đều có thể lên web.

   Chốt chặn này TỪNG nằm trong build.cjs, và đó là đặt sai cửa: lệnh deploy không
   chạy build. "cd nga-dist && firebase deploy" là bỏ qua chốt hoàn toàn, mà đó lại
   đúng là lệnh tôi hay gõ khi chỉ muốn đẩy lại bản cũ. Khoá cửa mình biết rồi để
   ngỏ cửa thật thì còn tệ hơn không khoá, vì mình tưởng là đã yên.
   Nên nó chuyển về đây và được gọi từ "predeploy" trong firebase.json: firebase
   chạy nó TRƯỚC mỗi lần deploy, lệnh này thoát khác 0 là deploy dừng. build.cjs
   cũng gọi chính tệp này, để chỉ có một danh sách duy nhất, không có hai bản lệch nhau.

   Liệt kê thứ ĐƯỢC PHÉP, không liệt kê thứ bị cấm: dựa vào danh sách cấm thì phải
   đoán trước mọi cái tên có thể xuất hiện, và tôi đã đoán trượt một lần
   (firebase.json.truoc — danh sách ignore bỏ qua "firebase.json", không bỏ qua nó).
   Thêm tên vào đây phải là một quyết định có ý, không phải chuyện lỡ tay. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* fileURLToPath chu khong tu cat chuoi: tren Windows duong dan that co the chua
   ky tu ~ , trong URL no thanh %7E, va ban tu cat de nguyen %7E -> doc nham thu
   muc, bao "khong co thu muc" o moi lan build. Da dinh dung loi do. */
const THU_MUC = path.dirname(fileURLToPath(import.meta.url));

const DUOC_PHEP = new Set([
  /* bay lên web */
  "index.html", "sw.js", "manifest.json", "icon.svg", "fonts.css", "NOTICE", ".nojekyll",
  /* cấu hình deploy, không bay lên */
  "firebase.json", ".firebaserc", ".soat-thu-muc.mjs",
  /* hạ tầng: kho git của bản dist, và bộ nhớ đệm của firebase CLI */
  ".git", ".gitignore", ".firebase",
  /* firebase-debug.log do chính firebase sinh ra MỖI LẦN deploy hỏng — kể cả lần
     hỏng do chốt này chặn. Không cho phép nó thì thành thắt nút: chặn -> sinh log
     -> lần sau thấy log lạ -> chặn tiếp, dọn tay cũng không thoát vì nó mọc lại.
     Nên cho phép ở đây, và chặn nó lên web bằng danh sách ignore trong firebase.json. */
  "firebase-debug.log",
]);

/* Chốt này lúc đầu chỉ hỏi MỘT CHIỀU: "có gì thừa không". Đo thử thì thấy ngay
   chiều kia bỏ ngỏ hoàn toàn — xoá index.html đi, chốt vẫn nói "không có tệp lạ"
   và thoát 0. Thư mục thiếu thì có thừa gì đâu: sạch bong, và sạch theo đúng
   nghĩa tai hại nhất. Deploy lúc ấy là đẩy một trang không có index.html lên,
   mà site này có luật bắt mọi đường dẫn về index.html — nên mất index.html là
   mất cả app, không phải mất một trang.
   Kèm cỡ tối thiểu, vì "tệp có mặt" chưa đủ: một tệp bị cắt cụt hay ghi dở vẫn
   có mặt. Mấy con số dưới đây đặt thấp hơn hẳn cỡ thật (index.html ~600KB), chỉ
   để bắt cái rỗng và cái cụt, không phải để canh từng byte. */
const PHAI_CO = {
  "index.html": 100000,
  "sw.js": 500,
  "manifest.json": 100,
  "icon.svg": 100,
  "fonts.css": 10000,
  "NOTICE": 10,
  "firebase.json": 200,
  ".firebaserc": 10,
};

/* Đi HẾT CÂY, xét từng tệp theo đường dẫn.
   Bản trước chỉ soát tầng trên cùng. Nó vẫn bắt được nga-dist/anh/rac.txt — nhưng
   bắt nhầm lý do: "anh" bị chặn vì cái TÊN lạ, chứ không phải vì có ai nhìn vào bên
   trong. Chỗ dựa là một giả định tôi chưa bao giờ phát biểu: thư mục được phép sẽ
   không có thư mục con.
   Tôi từng vá bằng cách cho chốt tự canh giả định ấy — hễ một mục được phép hoá ra
   là thư mục thì dừng. Nhưng canh giả định thì vẫn còn giả định, chỉ thêm một cái
   chuông; mà ngày nào app thật sự cần một thư mục con (ảnh, phông, gì đó) thì chuông
   kêu đúng lúc người ta đang làm việc hợp lệ, và cách sửa tự nhiên nhất dưới sức ép
   là nới nó ra — tức là lỗ mở lại, do chính cái chuông đẩy tới.
   Bỏ hẳn giả định thì ngày ấy không có gì phải sửa: thêm "anh/logo.png" vào danh
   sách là xong, và mọi tệp khác trong "anh/" vẫn bị chặn như thường. */
const BO_QUA = new Set([".git", ".firebase"]);   /* firebase không tải hai cái này lên bao giờ */

function diHet(goc, tien = "") {
  const ra = [];
  for (const d of fs.readdirSync(path.join(THU_MUC, goc || "."), { withFileTypes: true })) {
    const duong = tien ? tien + "/" + d.name : d.name;
    if (d.isDirectory()) {
      if (BO_QUA.has(duong)) continue;
      ra.push(...diHet(duong, duong));
    } else {
      ra.push(duong);
    }
  }
  return ra;
}

/* Soát THIẾU trước, vì nó nguy hơn: thừa một tệp là lộ một tệp, thiếu index.html
   là mất cả app. Và in riêng, không dùng chung tiêu đề với phần thừa — một tiêu
   đề dùng cho hai loại lỗi trái ngược thì ít nhất một nửa số lần nó nói sai. */
/* HAI câu hỏi, không phải một.
   Hỏi "tệp có đủ to không" là hỏi sai câu, và một phép kiểm hỏi sai câu thì vẫn
   XANH — cái xanh ấy hại hơn không có phép kiểm, vì giờ có người tin nó. Đo thật:
   cắt index.html còn đúng một nửa (599450 -> 299725 byte, kết thúc giữa chừng ở
   "localStorage.set") thì chốt vẫn nói "đủ 8 tệp bắt buộc", thoát 0. Nửa tệp ấy
   là trang trắng.
   Nên hỏi thêm câu thứ hai: tệp có TRỌN không. Dấu kết thúc thì rẻ và chắc hơn
   mọi ngưỡng cỡ — một tệp bị cắt thì không có đuôi, dù nó to bao nhiêu.
   Ngưỡng cỡ vẫn giữ để bắt cái rỗng, và vẫn đặt thấp hơn hẳn cỡ thật: canh sát
   quá thì mỗi lần sửa nội dung lại báo động giả, mà báo động giả vài lần là người
   ta thôi đọc — lúc ấy phép kiểm còn chạy nhưng đã hết tác dụng. */
const TRON = {
  "index.html": (s) => s.trimEnd().endsWith("</html>") || "khong ket thuc bang </html>",
  /* Dấu kết thúc phải nằm Ở CUỐI tệp, không thì nó không trả lời câu đang hỏi.
     Bản đầu tôi hỏi sw.js "có dòng const CACHE không" — dòng ấy là dòng SỐ 1, nên
     cắt đôi tệp vẫn còn nguyên và chốt vẫn xanh. Đúng cái bệnh vừa sửa ở index.html,
     tái phát ngay trong cùng một lần sửa. Đo mới thấy, đọc lại code thì không. */
  "sw.js": (s) => {
    const t = s.trimEnd();
    if (!/const CACHE = "nga-v\d+"/.test(s)) return "khong thay dong const CACHE";
    if (!t.endsWith("});")) return "khong ket thuc bang });";
    return true;
  },
  "firebase.json": (s) => { try { JSON.parse(s); return true; } catch (e) { return "khong phai JSON hop le"; } },
  "manifest.json": (s) => { try { JSON.parse(s); return true; } catch (e) { return "khong phai JSON hop le"; } },
  ".firebaserc": (s) => { try { JSON.parse(s); return true; } catch (e) { return "khong phai JSON hop le"; } },
  "icon.svg": (s) => s.trimEnd().endsWith("</svg>") || "khong ket thuc bang </svg>",
  "fonts.css": (s) => s.trimEnd().endsWith("}") || "khong ket thuc bang }",
};

/* "Bắt được lỗi" và "chính tôi sập" KHÔNG được phép nhìn giống nhau.
   Đo thật: nhét một lỗi lập trình vào chốt này rồi chạy deploy — firebase in ra
   đúng một câu "predeploy error: Command terminated with non-zero exit code 1",
   y hệt lúc chốt chặn thật. Nhìn từ ngoài thì tưởng đang được bảo vệ, trong khi
   thư mục deploy CHƯA HỀ được soát một dòng nào. Một cái chốt sập mà vẫn "trông
   như đang gác" thì gác được rất lâu trước khi có ai nhận ra.
   Nên: bắt được lỗi -> thoát 1. Chốt tự sập -> thoát 3 kèm câu nói thẳng ra. */
function soat() {
const thieu = [];
for (const [ten, coToiThieu] of Object.entries(PHAI_CO)) {
  const duong = path.join(THU_MUC, ten);
  let c = -1;
  try { c = fs.statSync(duong).size; } catch (e) { /* không có */ }
  if (c < 0) { thieu.push(ten + " — KHONG CO"); continue; }
  if (c < coToiThieu) { thieu.push(ten + " — chi " + c + " byte, doi it nhat " + coToiThieu); continue; }
  const hoi = TRON[ten];
  if (hoi) {
    const ket = hoi(fs.readFileSync(duong, "utf8"));
    if (ket !== true) thieu.push(ten + " — BI CAT: " + ket);
  }
}
if (thieu.length) {
  console.error("DUNG LAI: ban dung trong nga-dist bi THIEU hoac bi cut:");
  for (const t of thieu) console.error("  " + t);
  console.error("Deploy luc nay la day mot ban dung do dang len — site nay co luat bat");
  console.error("moi duong dan ve index.html, nen mat index.html la mat ca app.");
  console.error("Chay lai 'node build.cjs <so ban>' roi deploy.");
  process.exit(1);
}

const la = diHet("").filter(t => !DUOC_PHEP.has(t));
if (la.length) {
  console.error("DUNG LAI: co tep LA trong nga-dist:");
  for (const t of la) console.error("  " + t);
  console.error("Thu muc nay la thu muc deploy — de quen o day la lan sau no len web.");
  console.error("");
  /* Chan thoi chua du: phai lam cho CACH SUA DUNG de hon cach sua sai.
     Dong "them ten vao DUOC_PHEP" truoc day mo ho — nguoi doc dang cam mot tep nam
     sau se doan la them TEN THU MUC, va cach lam ay mo ca mot nhanh cay de lot mot
     tam anh. Nen in thang dong can dan, dung nguyen van, kem cau noi ro pham vi. */
  console.error("Neu that su muon day len, dan DUNG dong nay vao DUOC_PHEP:");
  console.error("  " + la.map(t => JSON.stringify(t)).join(", ") + ",");
  console.error("Moi dong la MOT tep. Them \"anh/logo.png\" khong mo ca thu muc anh/:");
  console.error("cac tep khac trong do van bi chan, va do la co y.");
  process.exit(1);
}
/* Dòng xanh phải nói ĐÚNG những gì vừa kiểm. Trước đây nó chỉ nói "không có tệp
   lạ" trong khi chốt còn soát cả chuyện đủ/thiếu — người đọc tưởng mình được
   bảo đảm ít hơn thực tế cũng là một kiểu nói sai. */
console.log("nga-dist: du " + Object.keys(PHAI_CO).length + " tep bat buoc, khong co tep la.");
}

try {
  soat();
} catch (e) {
  console.error("CHOT NAY SAP — day KHONG phai 'bat duoc loi', day la loi cua CHINH CHOT.");
  console.error("Deploy da dung lai, nhung thu muc deploy CHUA HE duoc soat mot dong nao.");
  console.error("Sua chot roi chay lai; dung bo qua, vi bo qua la deploy khong co ai gac.");
  console.error(String((e && e.stack) || e).split("\n").slice(0, 5).join("\n"));
  process.exit(3);
}
