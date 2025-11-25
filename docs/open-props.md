# Open Props TL;DR

CSS custom properties library - design tokens for spacing, colors, typography, etc.

## Install

```bash
npm install open-props
```

## Import

```css
@import "open-props/style";          /* all props */
@import "open-props/normalize";       /* optional normalize */
```

## Key Props

| Category | Props |
|----------|-------|
| Spacing | `--size-{1-15}` (rem), `--size-fluid-{1-10}` (clamp) |
| Typography | `--font-size-{0-8}`, `--font-size-fluid-{0-3}` |
| Colors | `--gray-{0-12}`, `--blue-{0-12}`, etc. (low=light, high=dark) |
| Radius | `--radius-{1-6}`, `--radius-round` |
| Shadows | `--shadow-{1-6}`, `--inner-shadow-{0-4}` |
| Easing | `--ease-{1-5}`, `--ease-in-{1-5}`, `--ease-out-{1-5}`, `--ease-in-out-{1-5}` |
| Animation | `--animation-fade-in`, `--animation-slide-in-up`, etc. |
| Fonts | `--font-sans`, `--font-mono`, `--font-weight-{1-9}` |
| Line height | `--font-lineheight-{00-5}` |
| Borders | `--border-size-{1-5}` |

## Theming Pattern

```css
:root {
  --text-1: var(--gray-8);
  --surface-1: var(--gray-0);
}

@media (prefers-color-scheme: dark) {
  :root {
    --text-1: var(--gray-1);
    --surface-1: var(--gray-12);
  }
}
```

## Usage Example

```css
.card {
  padding: var(--size-3);
  border-radius: var(--radius-2);
  box-shadow: var(--shadow-2);
  font-size: var(--font-size-2);
}

.animate {
  animation: var(--animation-fade-in) var(--ease-3);
}
```

## Color Scale

Colors go 0-12: low numbers = light, high numbers = dark.

Available palettes: gray, stone, red, pink, purple, violet, indigo, blue, cyan, teal, green, lime, yellow, orange, choco, brown, sand, camo, jungle.
