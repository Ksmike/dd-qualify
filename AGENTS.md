<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# HeroUI & Tailwind CSS Guidelines

## Core Principles

- **Composition over customization.** Prefer composing HeroUI components together rather than overriding their internals. Only customize when the default behavior genuinely doesn't fit.
- **Reusability first.** Every component you create should be usable in at least two contexts. If it's truly one-off, it doesn't need its own file.
- **Sensible abstractions.** Don't wrap a HeroUI component in another component unless you're adding meaningful logic, enforcing consistent props, or combining multiple elements into a cohesive unit. A wrapper that just passes props through adds indirection without value.

## Component Architecture

- Place shared/reusable components in `components/`. Page-specific components live alongside their page in the route folder.
- Name component files in PascalCase matching the export: `StatusBadge.tsx` exports `StatusBadge`.
- Keep components focused — one responsibility per file. If a component file exceeds ~150 lines, consider splitting it.
- Co-locate component variants and types in the same file unless they're shared across multiple components.

## Using HeroUI

- Import from `@heroui/react` directly. Don't re-export HeroUI components unless you're adding project-specific defaults.
- When you need a project-specific variant of a HeroUI component (e.g., a `PrimaryButton` that always uses a certain color/size), create a thin wrapper that sets those defaults and passes the rest through.
- Respect HeroUI's built-in accessibility. Don't override `aria-*` attributes or roles unless you have a specific reason.
- Use HeroUI's theming system for global style changes rather than overriding component styles inline.

## Tailwind CSS Usage

- Use Tailwind utility classes for layout, spacing, and one-off styling.
- **Don't fight the component library.** If HeroUI provides a prop for a style (color, size, variant), use the prop — don't override it with Tailwind classes.
- Avoid long class strings (>5-6 utilities). When a set of utilities repeats across components, extract it into a component or use Tailwind's `@apply` sparingly in `globals.css`.
- Keep responsive design consistent: mobile-first with `sm:`, `md:`, `lg:` breakpoints.

## Semantic Theming

- **Always use semantic color tokens** — never hardcode hex/rgb values. Use HeroUI's semantic palette: `primary`, `secondary`, `success`, `warning`, `danger`, `default`, `foreground`, `background`, `content1`–`content4`, `divider`, `focus`.
- Reference tokens via Tailwind classes: `text-foreground`, `bg-background`, `bg-content1`, `border-divider`, `text-primary`, etc.
- For HeroUI components, use the `color` prop (`color="primary"`, `color="danger"`) rather than applying color classes manually.
- Define all theme colors in a central theme configuration. Components should never introduce one-off color values.
- Support dark mode by relying on semantic tokens — they automatically adapt. Never branch on `dark:` with raw colors; let the theme handle it.
- When adding a new semantic meaning (e.g., "muted", "accent"), extend the theme in one place rather than scattering custom CSS variables across files.

## Abstraction Rules of Thumb

1. **Two or more usages** — Extract into a shared component only after you see the pattern repeat.
2. **Props, not config objects** — Keep component APIs flat and explicit. Avoid god-objects like `config={{ ... }}`.
3. **No premature generalization** — Build for the current need. Generalize when a second use case arrives, not before.
4. **Slots and children over deep prop drilling** — Use composition (`children`, render props, or HeroUI slots) to keep components flexible without exploding the prop surface.
