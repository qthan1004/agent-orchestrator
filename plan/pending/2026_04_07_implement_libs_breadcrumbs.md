# @thanh-libs/breadcrumb

## Components

### Breadcrumb
| Props | Type | Description |
|-------|------|-------------|
| `separator` | `ReactNode` | Ký tự/icon phân cách giữa các item |
| `maxItems` | `number` | Số item tối đa hiển thị |
| `itemsBeforeCollapse` | `number` | Số item giữ lại trước dấu "..." |
| `itemsAfterCollapse` | `number` | Số item giữ lại sau dấu "..." |

### BreadcrumbItem
| Props | Type | Description |
|-------|------|-------------|
| `href` | `string` | Link URL |
| `onClick` | `() => void` | Click handler |
| `icon` | `ReactNode` | Icon hiển thị trước label |
| `active` | `boolean` | Đánh dấu item hiện tại (last crumb) |

## Phụ thuộc
- `@thanh-libs/theme`
