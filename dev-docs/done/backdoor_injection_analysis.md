# Phân tích Cơ chế Backdoor Injection (Auto-Submit 100%)

Tài liệu này giải thích chi tiết cơ chế kỹ thuật để đạt được khả năng tự động hóa 100% (gửi lệnh trực tiếp vào khung Chat của Antigravity) thông qua kỹ thuật **DOM Injection / Monkey Patching**, cùng với các rủi ro (risks) đi kèm.

## 1. Cơ chế hoạt động (The "How")

VS Code và Antigravity được xây dựng dựa trên nền tảng Electron. Giao diện của chúng thực chất là một trang web khổng lồ chạy bằng Chromium. File gốc định nghĩa giao diện này nằm trên ổ cứng ở đường dẫn tương tự như:
`/usr/share/antigravity/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html`

Vì Extension API chính thống đã khóa chặt khả năng tự động điền chữ vào khung AI Chat (để bảo mật), chúng ta phải lách luật bằng cách **"Hack thẳng vào mã nguồn HTML"** của IDE.

### Luồng thực thi:

1. **The Injector (Mũi tiêm):** Khi Agent Orchestrator khởi động, nó sẽ dùng quyền truy cập file hệ thống (Node.js `fs`) để tìm file `workbench.html` của IDE.
2. **Monkey Patching:** Orchestrator chèn thêm một dòng mã HTML vào cuối file đó:
   ```html
   <script src="http://127.0.0.1:3847/orchestrator-bridge.js"></script>
   ```
3. **The Bridge (Cầu nối):** Mỗi khi anh mở IDE lên, đoạn script lậu kia sẽ tự động tải từ Orchestrator và chạy ở quyền cao nhất (Root DOM) của giao diện IDE. Nó sẽ mở một kết nối WebSocket ngược về Orchestrator.
4. **The Puppeteer (Kẻ giật dây):** Khi Orchestrator phát hiện Agent bị kẹt (STUCK), thay vì văng thông báo ra Desktop, nó bắn một lệnh qua WebSocket:
   `{"action": "submit_chat", "prompt": "Continue working..."}`
5. **The Ghost (Thực thi DOM):** Script lậu nhận lệnh, dùng Javascript tìm thẻ `<textarea>` của Chat Panel, điền chữ vào, và kích hoạt sự kiện click mô phỏng phím Enter. Mọi thứ diễn ra tự động 100%.

---

## 2. Rủi ro (The Risks)

Đạt được cảnh giới "tự động hoàn toàn" đòi hỏi sự đánh đổi rất lớn về mặt ổn định và bảo mật của hệ thống.

### 🔴 Nhóm A: Rủi ro hệ thống (System Risk)

#### Risk A1: Cảnh báo "Installation Corrupt" (Hỏng hệ thống)

VS Code có cơ chế kiểm tra tính toàn vẹn (Checksum / Signature) của toàn bộ mã nguồn. Việc chúng ta cố tình sửa file `workbench.html` sẽ làm sai lệch Checksum này.
**Hậu quả:** IDE sẽ hiển thị một cảnh báo vĩnh viễn trên thanh trạng thái (Status Bar) hoặc lúc khởi động: _"Your installation appears to be corrupt. Please reinstall."_ Khá gây khó chịu về mặt thị giác.

#### Risk A2: Đứt gãy khi Cập nhật (Brittle Maintenance)

Bất cứ khi nào Antigravity tải bản cập nhật mới (Update), file `workbench.html` sẽ bị ghi đè hoàn toàn về bản gốc.
**Hậu quả:** Backdoor của chúng ta bị xóa sổ. Orchestrator phải được thiết kế để liên tục giám sát (Watch) file này và thực hiện Inject lại sau mỗi lần cập nhật. Quá trình Inject lại có thể yêu cầu Restart IDE mới có hiệu lực.

#### Risk A3: Thay đổi cấu trúc DOM (UI Changes)

Kịch bản (Script) của chúng ta dựa vào việc tìm kiếm các thẻ HTML (ví dụ: `.chat-input-textarea` hay nút `Submit`).
**Hậu quả:** Nếu bản cập nhật của Antigravity đổi tên Class CSS hoặc đổi cấu trúc giao diện của khung Chat, đoạn script DOM Injection sẽ gãy ngang (Tìm không ra phần tử để click). Anh phải tự tay bảo trì và fix lại script này theo thời gian.

#### Risk A4: Xung đột đặc quyền (Permissions / Sandbox)

Ở một số hệ điều hành (như Linux/MacOS), thư mục cài đặt của ứng dụng (`/usr/share/` hoặc `/Applications/`) yêu cầu quyền `sudo` (Root/Admin) để sửa đổi file.
**Hậu quả:** Orchestrator sẽ không thể tự động sửa file `workbench.html` nếu nó chỉ chạy ở quyền User bình thường. Anh phải thiết kế cơ chế cấp quyền (Chạy `sudo` lúc setup).

### 🔴 Nhóm B: Rủi ro tài khoản (Account Risk)

DOM Injection là hành vi sửa file cài đặt IDE và tự động submit prompt thay người dùng. Dù chạy local, provider/IDE vẫn có thể quan sát dấu hiệu bất thường qua telemetry, integrity checks, crash reports, event logs, hoặc hành vi request bất thường.

**Hậu quả có thể xảy ra:**
- Ultra account bị đưa vào diện theo dõi hoặc giảm trust.
- Bị hạn chế quota, rate limit gắt hơn, hoặc tắt một số tính năng automation.
- Session/API bị revoke hoặc yêu cầu đăng nhập lại.
- Trường hợp xấu: account bị khóa hoặc ban nếu provider xem đây là né rào bảo mật/abuse automation.

Không có cách local cleanup nào đảm bảo xóa dấu vết đã gửi lên provider-side logs.

### 🔴 Nhóm C: Rủi ro policy/TOS (Provider Policy Risk)

Kỹ thuật này cố tình bypass rào bảo vệ của Extension API bằng cách sửa file `workbench.html` và chạy script ở Root DOM. Đây là vùng rủi ro cao về policy, vì nó có thể bị diễn giải là:
- sửa đổi client chính thức trái ý nhà cung cấp;
- bypass sandbox/review boundary của IDE;
- automation thao tác chat thay người dùng;
- cài script có hành vi giống backdoor, dù mục đích là local automation.

**Nguyên tắc vận hành:** Backdoor mode phải là opt-in riêng, có cảnh báo rõ ràng. Không bật mặc định, không bật lẫn với Semi-Auto Extension, không bật khi user chưa xác nhận hiểu rủi ro account/policy.

---

## 3. Cơ chế Dọn dẹp và Kiểm chứng (Cleanup & Audit)

Nếu đã chọn con đường Tà Đạo, một System Administrator thực thụ phải luôn thiết kế sẵn đường lui (Rollback) và công cụ để người dùng kiểm tra xem hệ thống của họ có đang bị cấy mã độc hay không.

### 🧹 Cơ chế Dọn dẹp Tự động từ Server (Auto-Cleanup)

Để đảm bảo IDE của người dùng luôn "sạch sẽ" sau khi làm việc, Orchestrator sẽ tự động dọn dẹp Backdoor theo cơ chế:

1. **Dọn dẹp khi Server tắt (Graceful Shutdown):**
   Orchestrator đăng ký sự kiện lắng nghe hệ điều hành (`process.on('SIGINT')` hoặc `SIGTERM`). Ngay khi người dùng nhấn `Ctrl+C` để tắt Server, hàm Cleanup sẽ lập tức chạy:
   `fs.copyFileSync('workbench.html.bak', 'workbench.html')`
   Nghĩa là: **Server sống thì Backdoor sống, Server tắt thì file local được restore về bản sạch nếu cleanup chạy thành công.** Việc restore này chỉ áp dụng cho file local, không đảm bảo xóa dấu vết provider-side logs/telemetry.

2. **Lệnh gỡ bỏ cưỡng chế (CLI Teardown):**
   Trong trường hợp Server bị Crash đột ngột (không kịp chạy Graceful Shutdown), hệ thống cung cấp một lệnh CLI để dọn dẹp khẩn cấp:
   `npm run backdoor:clean` hoặc `antigravity --remove-backdoor`

### 🔍 Cách User tự Kiểm chứng (Visual Audit)

Lập trình viên và System Admin "chỉ tin vào những gì họ thấy". Lệnh Terminal là chưa đủ, hệ thống cung cấp phương pháp **Mắt thấy tai nghe**:

**Cách 1: Kiểm tra trực quan bằng Mắt (Khuyên dùng)**
Người dùng có thể mở thẳng file gốc của IDE ra để xem ở dòng cuối cùng có bị cấy mã hay không:
`code /usr/share/antigravity/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html`
_(Hoặc dùng bất kỳ Text Editor nào)._
Anh cuộn xuống **dòng cuối cùng** của file. Nếu nó kết thúc bằng đúng thẻ `</html>` nguyên thủy và không có bất kỳ thẻ `<script src="orchestrator-bridge.js">` nào đính kèm, thì anh có thể tự tin 100% IDE của mình đang sạch.

**Cách 2: Quét bằng mã lệnh (CLI)**

```bash
grep -i "orchestrator-bridge" /usr/share/antigravity/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html
```

- **Không có kết quả trả về:** Chúc mừng, IDE đã sạch bóng quân thù!

### 🧯 Checklist trước/sau khi dùng Backdoor Mode

Trước khi bật:
- Backup file gốc `workbench.html`.
- Hiển thị đầy đủ rủi ro hệ thống, tài khoản, policy cho user.
- Bắt user xác nhận riêng cho Backdoor Mode, tách khỏi Semi-Auto Extension.
- Ghi lại đường dẫn file bị sửa và đường dẫn file `.bak`.

Khi đang chạy:
- Hiển thị trạng thái rõ ràng: `BACKDOOR ACTIVE`.
- Cung cấp lệnh kiểm tra nhanh bằng `grep`.
- Không tự reinject sau update nếu user chưa cho phép.

Khi tắt/gỡ:
- Restore `workbench.html` từ `.bak`.
- Chạy `grep -i "orchestrator-bridge" <workbench.html>` để xác nhận sạch.
- Restart IDE để đảm bảo script không còn trong renderer đang mở.
- Nếu cleanup fail, báo user reinstall/repair IDE.

---

## 3. Kết luận (Trade-off Analysis)

| Phương án                              | Mức độ Tự động          | Mức độ Ổn định       | Rủi ro Bảo trì                   |
| :------------------------------------- | :---------------------- | :------------------- | :------------------------------- |
| **Semi-Auto (Extension/Notification)** | 99% (Cần 1 Click/Paste) | **Tuyệt đối (100%)** | Thấp (Dùng API chuẩn)            |
| **Backdoor (DOM Injection)**           | **100% (Zero-Touch)**   | Thấp (Dễ gãy)        | Rất cao (Sửa HTML, theo dõi DOM) |

**Lời khuyên từ hệ thống:**
Việc tạo Backdoor là một giải pháp cực kỳ thú vị và thể hiện năng lực kỹ thuật (Hacking) cao. Nếu dự án này thuần túy là **Personal Playground (Sân chơi cá nhân)** và anh muốn trải nghiệm cảm giác "vắt kiệt" khả năng tự động hóa, Backdoor là lựa chọn tuyệt vời.
Tuy nhiên, nếu anh định hướng Orchestrator trở thành một **Hệ thống Lõi (Core Platform)** chạy ngày đêm và yêu cầu sự bền bỉ, anh nên chọn phương án **Semi-Auto**.
