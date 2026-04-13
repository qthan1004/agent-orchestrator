# Plan: App Project Prompt & Template Set

## Bối cảnh

Prompt hiện tại (`agent-prompt.md`) được tối ưu cho **component library** (Emotion, Storybook, monorepo libs). Khi dùng cho App projects (web, mobile, desktop), 20% nội dung sẽ gây sai hành vi hoặc bị skip vô nghĩa.

**Quyết định**: **Không sửa prompt lib** (breaking change) → Viết bổ sung 1 bộ riêng cho App.

---

## Design Principles

1. **App = ANY application**: web app, SPA, mobile (React Native, Flutter), desktop (Electron). Không gói gọn vào web.
2. **Convention discovery-first**: Planner deep-discover workspace → viết knowledge ngay trong `workspace_root/.agent/knowledge/` — KHÔNG hardcode patterns vào prompt
3. **Template-driven identification**: Server phân biệt lib vs app qua template prefix → task/log nhận diện đúng context
4. **Shared core**: Sections §0-§3, §W, §I, §4-§5 giữ nguyên (reuse hoặc copy). Chỉ khác §P Step 3D (Mandatory Tasks) và templates.

---

## Proposed Changes

### Prompts

#### [NEW] [agent-prompt-app.md](file:///home/administrator/back%20up/agent-orchestrator/prompts/agent-prompt-app.md)

Clone từ `agent-prompt.md`, thay đổi:

| Section | Thay đổi |
|---------|----------|
| §P Step 3A, Line 183 | Thay ví dụ lib (pxToRem, palette) → ví dụ đa dạng: routing patterns, state management, API layer, env config, auth flow |
| §P Step 3D "Mandatory Tasks" | Thay "Library Plans" block → **"App Plans"** block (xem bên dưới) |
| §P Step 3E Quality Checklist | Thay 4 lib-only items → 4 app-equivalent items |
| Appendix A | Thêm 1 GOOD example cho app (page/feature task thay vì styled component) |
| Appendix B | Thêm MANIFEST example: `src/features/auth (hash: xyz)` |

**App Mandatory Tasks block:**

```markdown
**Mandatory Tasks for App Plans:**
Every plan that modifies/creates a feature MUST include:
- **Setup task**: route registration, navigation entry, env config, permissions — whatever the feature needs to be reachable
- **Core implementation task(s)**: the actual feature logic (pages, screens, components, services)
- **Integration test task**: verify the feature works in context (e.g., navigation to page, API calls, state updates)
- **Verification task**: existing tests still pass, build succeeds, no regressions

If the project uses Storybook or a component playground → include a Stories/Demo task.
If the project has API docs (Swagger, OpenAPI) → include a Docs update task.
```

> [!IMPORTANT]
> **Không hardcode framework-specific rules** (React Router, Vue Router, Flutter Navigator). Planner discovery sẽ tự tìm ra routing pattern từ workspace — prompt chỉ nói "route registration" chung.

---

### Templates

#### [NEW] [knowledge-app.md](file:///home/administrator/back%20up/agent-orchestrator/templates/knowledge-app.md)

Template knowledge dành cho App projects:

```markdown
# Project Knowledge (App)

## 1. Project Topology
- **App Type**: [...] (Web SPA, Mobile RN, Mobile Flutter, Desktop Electron, Fullstack)
- **Core Tech Stack**: [...] (e.g. Next.js + TypeScript, React Native + Expo, Flutter + Dart)
- **State Management**: [...] (e.g. Redux, Zustand, Provider, Riverpod)
- **Architecture Pattern**: [...] (e.g. Feature-based, Layer-based, Clean Architecture)

## 2. Tools & Workflows
- **Dev Server**: [...] (e.g. `npm run dev`, `expo start`, `flutter run`)
- **Build**: [...] (e.g. `npm run build`, `eas build`, `flutter build`)
- **Testing**: [...] (e.g. Vitest, Jest, Flutter test)
- **Linting**: [...] (e.g. ESLint, Dartanalyzer)

## 3. Directory Map
- `src/`: [...]
  - `pages/` or `screens/`: [...]
  - `components/`: [...]
  - `services/` or `api/`: [...]
  - `hooks/` or `utils/`: [...]
  - `store/` or `state/`: [...]
- `tests/` or `__tests__/`: [...]
- `public/` or `assets/`: [...]

## 4. Architecture Conventions & Gotchas
### 4.1. [Routing/Navigation]
### 4.2. [API Layer / Data Fetching]
### 4.3. [Auth / Permissions]
### 4.4. [Error Handling]

## 5. Shared Utilities
| Utility | Location | Description | Example |
|---------|----------|-------------|---------|

## 6. Environment & Config
- **Env files**: [...] (.env, .env.local, etc.)
- **Config pattern**: [...] (how config is accessed)
- **Feature flags**: [...] (if applicable)
```

#### [MODIFY] [prompts/README.md](file:///home/administrator/back%20up/agent-orchestrator/prompts/README.md)

Cập nhật hướng dẫn chọn prompt:

```markdown
### Available Prompts

| Prompt | Use For |
|--------|---------|
| `agent-prompt.md` | Component libraries, design systems, monorepo packages |
| `agent-prompt-app.md` | Web apps, SPAs, mobile apps, desktop apps |

**How to choose?** 
- Building/maintaining a **reusable package** published to npm/registry → use `agent-prompt.md`
- Building/maintaining an **application** that users interact with → use `agent-prompt-app.md`
```

---

### Server — Template Routing (Optional Enhancement)

#### Prefix Convention

Để server/agent nhận biết context:

| Element | Lib Prompt | App Prompt |
|---------|-----------|-----------|
| Knowledge template | `get_template("knowledge.md")` | `get_template("knowledge-app.md")` |
| Task ID prefix | `01-scaffold`, `02-models` | `01-setup`, `02-feature-core` |
| Log prefix | `[LIB]` | `[APP]` |
| MANIFEST scope | `libs/switch (hash: x)` | `src/features/auth (hash: x)` |

> [!NOTE]
> Server code (`tools.mjs`) **KHÔNG cần thay đổi** — `get_template` đã nhận `template_name` param tự do. Agent app prompt sẽ gọi `get_template("knowledge-app.md")` và server trả đúng file.

---

## Không thay đổi

- ❌ `agent-prompt.md` — giữ nguyên cho lib projects
- ❌ `templates/knowledge.md` — giữ nguyên cho lib projects  
- ❌ Server code (`src/`) — không cần sửa
- ❌ Exchange format — task JSON schema giữ nguyên

---

## Open Questions

> [!IMPORTANT]
> **Q1**: Prompt app có nên reference `agent-prompt.md` sections (import/include) hay copy nguyên? 
> - **Copy**: Dễ maintain độc lập, nhưng drift risk khi sửa shared sections
> - **Reference**: "Xem §W, §I, §4, §5 từ agent-prompt.md" — agent cần đọc 2 files
> 
> **Recommendation**: Copy toàn bộ. Prompt là self-contained document cho 1 session. Agent không nên đọc 2 files.

> [!IMPORTANT]  
> **Q2**: Có cần shared base template cho knowledge không? (base sections chung + type-specific sections)
> - Hiện tại 2 templates riêng biệt (knowledge.md + knowledge-app.md)
> - Có thể tạo knowledge-base.md + knowledge-lib-addon.md + knowledge-app-addon.md
>
> **Recommendation**: Giữ 2 files riêng biệt. Đơn giản hơn, mỗi template self-contained.

---

## Verification Plan

### Manual
1. Dùng `agent-prompt-app.md` cho 1 Next.js project test → Planner decompose đúng (route setup, page components, tests)
2. Dùng `agent-prompt.md` cho lib project (breadcrumb hiện tại) → vẫn chạy đúng như trước (regression check)
3. `get_template("knowledge-app.md")` trả đúng nội dung

### Scope
- 2 files mới: `prompts/agent-prompt-app.md`, `templates/knowledge-app.md`
- 1 file sửa: `prompts/README.md`
- 0 server code changes
