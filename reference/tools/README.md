# Tools

Scripts hỗ trợ quản lý workspace và các libs. Tất cả chạy từ **workspace root**.

---

## apply-all-libs.sh — Thao tác hàng loạt trên tất cả libs

```bash
# Chạy lệnh trong mỗi lib (dừng nếu lỗi)
bash tools/apply-all-libs.sh run '<command>'

# Chạy lệnh trong mỗi lib (bỏ qua lỗi, tiếp tục)
bash tools/apply-all-libs.sh check '<command>'

# Copy 1 file vào tất cả libs
bash tools/apply-all-libs.sh sync <source-file> [dest-path]
```

**Ví dụ:**
```bash
# Install package cho tất cả libs
bash tools/apply-all-libs.sh run 'npm install -D some-package'

# Xem version từng lib
bash tools/apply-all-libs.sh check 'node -p "require(\"./package.json\").version"'

# Đồng bộ tsconfig mới vào tất cả libs
bash tools/apply-all-libs.sh sync /tmp/tsconfig.json tsconfig.json

# Đồng bộ CI workflow
bash tools/apply-all-libs.sh sync templates/publish.yml .github/workflows/publish.yml
```

---

## git-push.sh — Push code (daily use)

```bash
bash tools/git-push.sh "<commit-message>"               # workspace only
bash tools/git-push.sh "<commit-message>" <lib-name>     # 1 lib + workspace ref
bash tools/git-push.sh "<commit-message>" --all          # all libs + workspace ref
```

---

## gen-lib.sh — Tạo lib mới

```bash
bash tools/gen-lib.sh <lib-name>
```

Scaffold lib React mới từ `tools/templates/`, tạo cấu trúc Nx + Storybook + Vite.

---

## git-setup-lib.sh — Setup Git cho lib mới

```bash
bash tools/git-setup-lib.sh <lib-name>
```

Tạo GitHub repo, init git, push initial commit, đăng ký submodule. **Chạy sau `gen-lib.sh`.**

---

## publish-lib.sh — Publish lib lên NPM

```bash
bash tools/publish-lib.sh alpha   <lib-name>   # Tạo branch release, version alpha
bash tools/publish-lib.sh release <lib-name>   # Version chính thức
bash tools/publish-lib.sh merge   <lib-name>   # Merge release → master, xoá branch
bash tools/publish-lib.sh update  <lib-name>   # Cập nhật workspace ref + RELEASES.md
```

**Flow tuần tự:** `alpha` → CI pass → `release` → CI pass → `merge` → `update`

---

## check-lib-deps.sh — Kiểm tra dependencies

```bash
bash tools/check-lib-deps.sh <lib-name>
```

So sánh import trong `src/` và `tests/` với `package.json`. Báo lỗi nếu thiếu package.

---

## clear-nexus.sh — Xoá Nexus registry URLs

```bash
bash tools/clear-nexus.sh
```

Tìm và thay thế tất cả Nexus URLs → `registry.npmjs.org`, xoá `package-lock.json`, chạy lại install.
