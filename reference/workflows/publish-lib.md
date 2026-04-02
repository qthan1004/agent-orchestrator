---
description: Publish a lib to npm via release branch and standard-version
---

// turbo-all

# Publish Lib

## 0. Dependency Check (bắt buộc — chạy trước tất cả)

```bash
cd libs/<lib-name> && node check-deps.mjs
```

- ✅ PASS → tiếp Step 1.
- ❌ FAIL → đọc output, fix `package.json` (thêm missing deps vào `peerDependencies` + `devDependencies` với `"*"`) → chạy lại `node check-deps.mjs` → **loop cho đến khi PASS**.
- Nếu lib chưa có `check-deps.mjs` → copy từ lib khác (e.g. `libs/menu/check-deps.mjs`), rồi chạy.
- Nếu có thay đổi → commit vào master + push trước khi tiếp.

## 1. Doc Check (bắt buộc trước khi publish)
- Đọc `src/index.ts` + `src/lib/models/` → liệt kê tất cả exported components, types, props.
- So sánh với `README.md` hiện tại → nếu thiếu/sai/cũ → regenerate/update README.
- Nếu có thay đổi README → commit vào master + push trước khi chạy alpha.

## 2. Alpha
```bash
bash tools/publish-lib.sh alpha <lib-name>
```

## 3. Tạo PR + Check CI
- `mcp_github_create_pull_request(owner="system-core-ui", repo=<lib-name>, title="release: <version>", head="release", base="master")` → ghi `pull_number`.
- Lấy HEAD SHA: `mcp_github_get_pull_request(owner="system-core-ui", repo=<lib-name>, pull_number=<N>)` → lấy `head.sha`.
- Poll CI bằng Check Runs API (⚠️ KHÔNG dùng `mcp_github_get_pull_request_status` — tool đó dùng Commit Status API, không đọc được GitHub Actions):
```bash
GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN" bash tools/check-ci-status.sh system-core-ui <lib-name> <head-sha> 10 30
```
- ✅ exit 0 → Step 4. ❌ exit 1 → đọc lỗi, fix, push lại, re-check. ⏳ exit 2 → hỏi user.

## 4. Official Release
```bash
bash tools/publish-lib.sh release <lib-name>
```
Lấy HEAD SHA mới từ release branch rồi poll CI tương tự Step 3:
```bash
GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN" bash tools/check-ci-status.sh system-core-ui <lib-name> <new-head-sha> 10 30
```
- ✅ PASS → Step 5.

## 5. Merge
- `mcp_github_merge_pull_request(owner="system-core-ui", repo=<lib-name>, pull_number=<N>, merge_method="merge")`
- Sync local:
```bash
cd libs/<lib-name> && git checkout master && git pull origin master && git branch -d release
```

## 6. Update Workspace
```bash
bash tools/publish-lib.sh update <lib-name>
```

## 7. Clean up
Xóa các file log tạm sinh ra trong quá trình kiểm tra CI hoặc fix dependencies:
```bash
rm -f ci_logs.txt ci2.log package-lock.json
```
