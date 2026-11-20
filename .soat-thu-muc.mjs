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

const la = diHet("").filter(t => !DUOC_PHEP.has(t));
if (la.length) {
  console.error("DUNG LAI: co tep la trong nga-dist:");
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
console.log("nga-dist: khong co tep la.");
