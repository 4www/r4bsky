# Migration Plan: Tailwind CSS → Open Props

## Current State

### Phase 1-4: DONE ✓
- [x] Tailwind removed from dependencies
- [x] `tailwind.config.js` deleted
- [x] `postcss.config.js` simplified
- [x] Open Props installed and imported
- [x] `cn()` simplified to just `clsx` wrapper
- [x] UI components migrated (button, input, label, textarea, skeleton, toast, card, dialog, dropdown-menu)
- [x] NavBar, NavTabs migrated with scoped CSS
- [x] Avatar, SearchProfiles migrated
- [x] Global CSS classes added for buttons, inputs, cards, dialogs, dropdowns, menus

### Phase 5: IN PROGRESS
- [ ] ProfileHeader, Player, TrackListItem - still have Tailwind class strings (non-functional)
- [ ] Route pages (~10 files) - still have Tailwind class strings (non-functional)
- [ ] Define semantic tokens in app.css (currently commented out)
- [ ] Test responsive behavior
- [ ] Audit dark mode

---

## Why Open Props?

- CSS-first (no build step for utilities, no purging)
- Design tokens as native CSS custom properties
- Aligns with r4 philosophy: minimal abstraction, semantic HTML, modern CSS
- Smaller bundle (~4kB for all props, or import only what you need)
- Works with native CSS features: `:has()`, `:where()`, container queries, nesting

---

## Open Props Import Strategy

**Option A: CDN (simplest)**
```css
@import "https://unpkg.com/open-props";
@import "https://unpkg.com/open-props/normalize.min.css";
```

**Option B: NPM with selective imports (recommended)**
```bash
npm install open-props
```
```css
/* Import only what we need */
@import "open-props/colors";
@import "open-props/sizes";
@import "open-props/shadows";
@import "open-props/borders";
@import "open-props/easings";
@import "open-props/animations";
@import "open-props/fonts";
```

**Option C: PostCSS JIT Props** (only ships props you actually use)
```bash
npm install postcss-jit-props
```

---

## Tailwind → Open Props Mapping

### Spacing (Tailwind `p-*`, `m-*`, `gap-*`)
| Tailwind | Open Props | Value |
|----------|------------|-------|
| `gap-1`, `p-1` | `var(--size-1)` | 0.25rem |
| `gap-2`, `p-2` | `var(--size-2)` | 0.5rem |
| `gap-3`, `p-3` | `var(--size-3)` | 1rem |
| `gap-4`, `p-4` | `var(--size-4)` | 1.25rem |
| `gap-5`, `p-5` | `var(--size-5)` | 1.5rem |
| `gap-6`, `p-6` | `var(--size-6)` | 1.75rem |
| `gap-8`, `p-8` | `var(--size-8)` | 3rem |

### Border Radius
| Tailwind | Open Props |
|----------|------------|
| `rounded-sm` | `var(--radius-1)` |
| `rounded` | `var(--radius-2)` |
| `rounded-md` | `var(--radius-2)` |
| `rounded-lg` | `var(--radius-3)` |
| `rounded-xl` | `var(--radius-4)` |
| `rounded-full` | `var(--radius-round)` |

### Shadows
| Tailwind | Open Props |
|----------|------------|
| `shadow-sm` | `var(--shadow-1)` |
| `shadow` | `var(--shadow-2)` |
| `shadow-md` | `var(--shadow-3)` |
| `shadow-lg` | `var(--shadow-4)` |
| `shadow-xl` | `var(--shadow-5)` |
| `shadow-2xl` | `var(--shadow-6)` |

### Typography
| Tailwind | Open Props |
|----------|------------|
| `text-xs` | `var(--font-size-0)` (0.75rem) |
| `text-sm` | `var(--font-size-1)` (1rem) |
| `text-base` | `var(--font-size-1)` |
| `text-lg` | `var(--font-size-2)` (1.1rem) |
| `text-xl` | `var(--font-size-3)` (1.25rem) |
| `text-2xl` | `var(--font-size-4)` (1.5rem) |
| `font-medium` | `var(--font-weight-5)` |
| `font-semibold` | `var(--font-weight-6)` |
| `font-bold` | `var(--font-weight-7)` |

### Colors (current r4 semantic tokens → Open Props)
| Current Token | Light Mode | Dark Mode |
|---------------|------------|-----------|
| `--background` | `var(--gray-0)` | `var(--gray-9)` |
| `--foreground` | `var(--gray-9)` | `var(--gray-0)` |
| `--muted` | `var(--gray-2)` | `var(--gray-8)` |
| `--border` | `var(--gray-3)` | `var(--gray-7)` |
| `--primary` | `var(--indigo-7)` | `var(--indigo-4)` |
| `--destructive` | `var(--red-7)` | `var(--red-4)` |
| `--accent` | `var(--violet-7)` | `var(--violet-4)` |

### Animations & Easing
| Tailwind | Open Props |
|----------|------------|
| `transition-all` | `transition: all 200ms var(--ease-2)` |
| `duration-200` | `200ms` |
| `duration-300` | `300ms` |
| `ease-in-out` | `var(--ease-in-out-2)` |
| `animate-pulse` | `var(--animation-pulse)` |
| `animate-spin` | `var(--animation-spin)` |

---

## Migration Strategy

### Phase 1: Setup (parallel run)
```bash
npm install open-props
```

Update `src/app.css`:
```css
/* Open Props imports */
@import "open-props/colors";
@import "open-props/sizes";
@import "open-props/shadows";
@import "open-props/borders";
@import "open-props/easings";
@import "open-props/animations";
@import "open-props/fonts";

/* Keep Tailwind temporarily for incremental migration */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Design tokens layer */
:root {
  --background: var(--gray-0);
  --foreground: var(--gray-9);
  --muted: var(--gray-2);
  --border: var(--gray-3);
  --primary: var(--indigo-7);
  --destructive: var(--red-7);
  --accent: var(--violet-7);
  --radius: var(--radius-2);
}

.dark {
  --background: var(--gray-9);
  --foreground: var(--gray-0);
  --muted: var(--gray-8);
  --border: var(--gray-7);
  --primary: var(--indigo-4);
  --destructive: var(--red-4);
  --accent: var(--violet-4);
}
```

### Phase 2: Component Migration Pattern

**Before (Tailwind):**
```svelte
<div class="flex gap-4 p-4 rounded-lg bg-background shadow-md hover:shadow-lg transition-all">
```

**After (Open Props + scoped CSS):**
```svelte
<div class="card">

<style>
  .card {
    display: flex;
    gap: var(--size-4);
    padding: var(--size-4);
    border-radius: var(--radius-3);
    background: var(--background);
    box-shadow: var(--shadow-3);
    transition: box-shadow 200ms var(--ease-2);

    &:hover {
      box-shadow: var(--shadow-4);
    }
  }
</style>
```

### Phase 3: Component Priority Order

**Batch 1 - Simple components:**
- [ ] `Skeleton.svelte`
- [ ] `Label.svelte`
- [ ] `Textarea.svelte`
- [ ] `Toast.svelte`

**Batch 2 - Form components:**
- [ ] `Input.svelte`
- [ ] `Button.svelte` (remove tailwind-variants)
- [ ] `Card` components (6 files)

**Batch 3 - Complex components:**
- [ ] `Dialog` components
- [ ] `DropdownMenu` components

**Batch 4 - App components:**
- [ ] `TrackListItem.svelte`
- [ ] `Player.svelte`
- [ ] `+layout.svelte`
- [ ] Route pages

### Phase 4: Remove Tailwind
- [ ] Remove `@tailwind` directives from app.css
- [ ] Delete `tailwind.config.js`
- [ ] Update `postcss.config.js`:
  ```js
  export default {
    plugins: {
      autoprefixer: {},
    },
  }
  ```
- [ ] Uninstall packages:
  ```bash
  npm uninstall tailwindcss tailwind-merge tailwind-variants shadcn-svelte
  ```
- [ ] Simplify `cn()` helper to just use `clsx`

### Phase 5: Cleanup
- [ ] Remove unused CSS
- [ ] Audit dark mode across all components
- [ ] Test responsive behavior
- [ ] Update any documentation

---

## Code Patterns

### Conditional classes (keep clsx)
```svelte
<script>
  import { clsx } from 'clsx';
  let active = false;
</script>

<button class={clsx('btn', active && 'btn-active')}>
```

### Dark mode
```css
/* Open Props + semantic tokens */
:root {
  --text-1: var(--gray-9);
  --surface-1: var(--gray-0);
}

.dark {
  --text-1: var(--gray-1);
  --surface-1: var(--gray-9);
}

/* Or use @media for OS preference */
@media (prefers-color-scheme: dark) {
  :root {
    --text-1: var(--gray-1);
  }
}
```

### Responsive design
```css
/* Use CSS container queries or media queries */
.card {
  /*padding: var(--size-fluid-1); /* Fluid sizing */*/
}

@media (min-width: 768px) {
  .card {
    padding: var(--size-5);
  }
}
```

### Hover/focus states
```css
.button {
  background: var(--primary);
  transition: background 150ms var(--ease-2);

  &:hover {
    background: var(--indigo-8);
  }

  &:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
}
```

---

## Files to Change

### Delete
- `tailwind.config.js`

### Modify
| File | Changes |
|------|---------|
| `postcss.config.js` | Remove tailwindcss plugin |
| `package.json` | Remove Tailwind deps, add open-props |
| `src/app.css` | Complete rewrite with Open Props |
| `src/lib/utils/index.ts` | Simplify cn() to just clsx |

### Migrate (34 files)
- `src/lib/components/ui/**/*.svelte` (10 components)
- `src/lib/components/*.svelte` (~10 files)
- `src/routes/**/*.svelte` (~14 files)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Visual regression | Migrate incrementally, test each component |
| Responsive breakage | Open Props has fluid sizing; add media queries as needed |
| Dark mode issues | Keep existing CSS variable pattern, just map to Open Props colors |
| bits-ui styling | bits-ui is unstyled; just apply Open Props-based styles |

---

## Questions

1. **Import strategy?** CDN vs NPM vs JIT Props
2. **Keep semantic tokens?** (`--background`, `--foreground`) or use Open Props directly
3. **Scoped styles vs global utilities?** Svelte `<style>` blocks vs utility classes
