# Migration Plan: Tailwind CSS → Open Props

## Remaining

- [ ] **DiscogsResource.svelte** - ~30 Tailwind classes
- [ ] **TrackForm.svelte** - ~35 Tailwind classes
- [ ] Test responsive behavior

---

## Tailwind → Open Props Quick Reference

### Spacing
| Tailwind | Open Props |
|----------|------------|
| `p-1`, `gap-1` | `var(--size-1)` |
| `p-2`, `gap-2` | `var(--size-2)` |
| `p-3`, `gap-3` | `var(--size-3)` |
| `p-4`, `gap-4` | `var(--size-4)` |

### Border Radius
| Tailwind | Open Props |
|----------|------------|
| `rounded` | `var(--radius-2)` |
| `rounded-lg` | `var(--radius-3)` |
| `rounded-full` | `var(--radius-round)` |

### Typography
| Tailwind | Open Props |
|----------|------------|
| `text-xs` | `var(--font-size-0)` |
| `text-sm` | `var(--font-size-1)` |
| `font-semibold` | `var(--font-weight-6)` |
| `font-bold` | `var(--font-weight-7)` |

### Layout (convert to CSS)
| Tailwind | CSS |
|----------|-----|
| `flex` | `display: flex` |
| `flex-1` | `flex: 1` |
| `items-center` | `align-items: center` |
| `justify-center` | `justify-content: center` |
| `min-w-0` | `min-width: 0` |
| `truncate` | `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` |
