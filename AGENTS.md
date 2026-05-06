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

---

# Icons — react-icons

## Usage

- **Use icons liberally** throughout the UI — navigation, buttons, empty states, list items, badges, and anywhere they improve scannability or visual hierarchy.
- Import from the icon set that fits the context. Prefer **Lucide** (`react-icons/lu`) as the default set for consistency. Fall back to other sets (Heroicons `hi2`, Feather `fi`, etc.) only when Lucide doesn't have what you need.
- Size icons with Tailwind classes (`className="size-4"`, `size-5`, etc.) rather than the `size` prop for consistency with the rest of the styling system.
- Pair icons with text labels in navigation and buttons for accessibility. Use `aria-hidden="true"` on decorative icons and provide an `aria-label` on icon-only buttons.
- Keep icon imports specific to avoid bundling the entire library:
  ```tsx
  import { LuSettings, LuLayoutDashboard } from "react-icons/lu";
  ```
- Don't wrap icons in extra components unless you're adding meaningful behavior.

## Localization & Labels

- **Never hardcode user-facing copy in components/pages.** Put all UI text in locale label files under `labels/<locale>/...`.
- Default locale is **English (`en`)**. New labels should be added to `labels/en/` first.
- Keep labels typed via `labels/types.ts`, and access them through the shared loader in `labels/index.ts`.
- When adding new UI sections, add corresponding label keys instead of inline strings.
- Treat locale as user data. `User.locale` should be used as the long-term source of truth, with fallback to `"en"`.

---

# Prisma 7 — Database & Schema

## Overview

This project uses **Prisma 7** with the new `prisma-client` generator (Rust-free client). This is NOT the Prisma you may know from v5/v6 — key differences below.

## Multi-File Schema

The schema is split across multiple `.prisma` files organized by domain:

```
prisma/
├── schema.prisma          ← Generator + datasource config ONLY
├── models/
│   ├── user.prisma        ← User model
│   └── auth.prisma        ← Account, Session, VerificationToken
└── migrations/
```

- **Adding a new domain:** Create a new file in `prisma/models/` (e.g., `project.prisma`, `billing.prisma`).
- Models can reference each other across files — Prisma merges them automatically. No imports needed.
- The `prisma.config.ts` points at the `prisma/` directory (not a single file).

## Prisma 7 Key Differences (vs v5/v6)

1. **Driver adapters are required.** You cannot just `new PrismaClient()`. You must pass an adapter:
   ```ts
   import { PrismaClient } from "@/lib/generated/prisma/client";
   import { PrismaPg } from "@prisma/adapter-pg";

   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
   const prisma = new PrismaClient({ adapter });
   ```

2. **Generated client lives in `lib/generated/prisma/`** — not in `node_modules`. Import from:
   ```ts
   import { PrismaClient } from "@/lib/generated/prisma/client";
   import type { User } from "@/lib/generated/prisma/models/User";
   ```

3. **`url` and `directUrl` are NOT in `schema.prisma`** — they go in `prisma.config.ts`.

4. **ESM-first** — the generated client is ESM.

5. **No auto-generate on migrate** — run `prisma generate` explicitly after schema changes.

## Singleton Pattern

Use the shared instance from `lib/db.ts` — never instantiate `PrismaClient` directly in route handlers or server actions:

```ts
import { db } from "@/lib/db";
```

## Workflow

```bash
# After changing any .prisma file:
yarn prisma generate          # Regenerate client
yarn prisma migrate dev       # Create + apply migration

# Check migration status:
yarn prisma migrate status
```

## Rules

- Never put connection strings in `schema.prisma` — they belong in `.env` and `prisma.config.ts`.
- Always use `@/lib/db` for database access — it handles the singleton + adapter setup.
- Keep `schema.prisma` minimal (generator + datasource only). All models go in `prisma/models/`.
- Name model files after their primary domain: `user.prisma`, `auth.prisma`, `billing.prisma`.
- `lib/generated/` is gitignored — it's regenerated via `postinstall` on deploy.

---

# Testing

## Overview

This project uses **Vitest** with **React Testing Library** for unit and integration tests. All tests live in `packages/tests/`.

## Directory Structure

```
packages/tests/
├── setup.ts               ← Global test setup (jsdom, RTL cleanup, common mocks)
├── mocks/
│   └── db.ts             ← Shared Prisma mock (auto-mocks @/lib/db)
├── unit/                  ← Unit tests (isolated, mocked dependencies)
│   ├── actions/           ← Server action tests
│   ├── lib/               ← Utility/library tests
│   └── components/        ← Component unit tests
└── integration/           ← Integration tests (multiple modules working together)
```

## Coverage Requirements

- **Minimum 90% line coverage** is enforced via `vitest.config.ts` thresholds.
- Coverage is measured over `lib/`, `components/`, and `app/` — excluding generated code and config files.
- Run `yarn test:coverage` to check coverage locally.

## Commands

```bash
yarn test              # Run all tests once
yarn test:watch        # Run in watch mode during development
yarn test:coverage     # Run with coverage report + threshold enforcement
```

## Rules

- **Every new feature or bug fix must include tests.** Aim for 90%+ line coverage on new code.
- Place unit tests in `packages/tests/unit/` mirroring the source structure (e.g., `lib/actions/auth.ts` → `packages/tests/unit/actions/auth.test.ts`).
- Place integration tests in `packages/tests/integration/`.
- Use the shared mock from `packages/tests/mocks/db.ts` for database interactions — don't create one-off Prisma mocks.
- Mock external dependencies (database, auth, third-party APIs) in unit tests. Integration tests may use real implementations where practical.
- Name test files `*.test.ts` or `*.test.tsx`.
- Use `describe` blocks to group related tests. Use clear, behavior-focused test names (e.g., `"returns error when password is too short"`).
- Don't test implementation details — test behavior and outcomes.
- For React components, prefer testing user-visible behavior (text, interactions) over internal state.
