# Feasibility Analysis: Minimal Spec → Detailed Plan

**Date**: 2026-04-13
**Question:** Planner nhận plan chỉ có 8 dòng (table + dependency) — có tự research ra plan chi tiết ngang switch không?

---

## Input cho Planner (toàn bộ)

```markdown
# Implementation Plan: `@thanh-libs/breadcrumb`

| Component | Props chính |
|-----------|-----|
| **Breadcrumb** | `separator`, `maxItems`, `itemsBeforeCollapse`, `itemsAfterCollapse` |
| **BreadcrumbItem** | `href`, `onClick`, `icon`, `active` |

**Phụ thuộc:** `theme`
```

---

## Planner có gì để research?

| Resource | Path | Cung cấp gì |
|----------|------|-------------|
| `context.md` | `.agent/context.md` | Tech stack, skill index, workflow list |
| Skills | `.agent/skills/*/SKILL.md` | Component patterns, styled conventions, testing patterns |
| Knowledge | `.agent/knowledge/project_knowledge.md` | forwardRef, useTheme, owner prefix, optional chaining |
| Reference code | `libs/chip/`, `libs/switch/` | Actual code patterns, file structure |
| Theme source | `libs/theme/src/` | spacing tokens, palette, typography |
| Prompt rules | Section P Steps 3A-3E | Mandatory research + validation workflow |

---

## What Planner MUST Figure Out (0 hints in spec)

### ✅ HIGH confidence — Có đủ dữ liệu

| Aspect | Data source | Risk |
|--------|------------|------|
| File structure | Reference chip/switch | 🟢 Low — pattern rõ ràng |
| Scaffold files | Clone từ chip | 🟢 Low — prompt yêu cầu rõ |
| Styled patterns | Skills + knowledge + chip code | 🟢 Low |
| forwardRef, displayName, exports | Skills + knowledge | 🟢 Low |
| Spacing tokens (gap, padding) | Theme source OR knowledge (nếu đã fix) | 🟢 Low |
| Stories structure | Reference chip/switch stories | 🟢 Low |

### ⚠️ MEDIUM confidence — Cần suy luận

| Aspect | Challenge | Risk |
|--------|----------|------|
| **`separator` prop type** | String? ReactNode? Cả hai? Planner phải quyết | 🟡 Có thể sai |
| **Collapse logic** | `maxItems` + `itemsBeforeCollapse/After` → cần implement expand/collapse with "..." button. Planner phải hiểu semantic từ prop names | 🟡 Logic phức tạp |
| **`<nav>` vs `<ol>` structure** | WAI-ARIA Breadcrumb pattern yêu cầu `<nav>` + `<ol>` + `<li>`. Planner có biết không? | 🟡 Phụ thuộc model knowledge |
| **`href` → `<a>` vs `<button>`** | BreadcrumbItem cần render `<a>` khi có href, `<button/span>` khi chỉ có onClick | 🟡 Semantic decision |
| **Unit tests** | Prompt CHƯA enforce mandatory test task (improvement chưa apply) | 🟡 Có thể bỏ sót |

### 🔴 LOW confidence — Cao rủi ro

| Aspect | Challenge | Risk |
|--------|----------|------|
| **`aria-current="page"`** | Active item cần `aria-current="page"`. Planner biết WAI-ARIA Breadcrumb pattern không? | 🔴 Likely missed |
| **Full a11y checklist** | Switch plan có checklist WCAG rõ ràng. Breadcrumb planner phải tự tạo | 🔴 Sẽ thiếu depth |
| **Separator rendering logic** | Separator giữa items nhưng KHÔNG render sau item cuối. Cũng không render giữa collapsed items | 🔴 Edge case |
| **helpers.ts extraction** | Chip có `helpers.ts` cho color logic. Breadcrumb collapse logic cũng nên tách helpers. Knowledge chưa document pattern này | 🔴 Likely flat code |

---

## Scenario Analysis

### Best case 🟢 (70% likely)

Planner dùng chip/switch references → ra plan đúng structure, đúng styled patterns. Code quality ngang switch.

**Nhưng**:
- Collapse logic sẽ đơn giản (basic slice, thiếu edge cases)
- A11y thiếu `aria-current`, thiếu `<nav>` + `<ol>` semantic
- Có thể thiếu test task
- Separator type sẽ là `string` thay vì `ReactNode`

### Average case 🟡 (20% likely)

Planner ra plan OK nhưng:
- Folder nesting lại flat (như switch) thay vì per-component (như chip)
- Thiếu unit test + README tasks
- Knowledge không update thêm module mới

### Worst case 🔴 (10% likely)

Planner không hiểu collapse logic từ prop names → implement sai, hoặc skip collapse entirely.

---

## Verdict

**Khả thi: CÓ — nhưng chất lượng sẽ giảm ~15-20% so với switch plan.**

Lý do switch plan tốt vì plan đã viết sẵn code, types, styled details, WCAG checklist. Planner chỉ cần validate + split tasks. Với breadcrumb, planner phải tự nghĩ ra toàn bộ.

### Gap chính sẽ ở:
1. **A11y depth** — thiếu WAI-ARIA breadcrumb specifics
2. **Collapse edge cases** — logic xử lý itemsBefore/After sẽ basic
3. **Separator** — type decision (string vs ReactNode)
4. **Missing tasks** — test + doc (chưa enforce trong prompt)

---

## Recommendations

- **Chạy nguyên trạng (không sửa gì)**: dùng kết quả để đo gap giữa "detailed plan" vs "minimal plan". Kết quả này sẽ giúp calibrate cần improve prompt bao nhiêu.
- **Hoặc apply improvement trước**: thêm mandatory test + doc tasks rule vào prompt, update knowledge với spacing convention → tăng chance thành công.
- **Không nên thêm vào plan**: code examples, file structure, stories list — planner phải tự figure out, đó mới là test thực sự.
