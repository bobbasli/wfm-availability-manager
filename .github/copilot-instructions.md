# Vue 3 / TypeScript development instructions

- Read `AGENTS.md`, README and `docs/` before editing. Preserve OAuth PKCE, selection guards, explicit edit confirmation, read-only schedules and the existing planning-space calculation.
- Use `<script setup lang="ts">` and Composition API in every Vue component. Strict TypeScript, no `any` or unchecked assertions of API response shapes. Validate external values from `unknown`.
- Within script setup: imports; props/emits/models; refs and computed state; methods; lifecycle hooks.
- Keep components presentational, page composition in `views/`, reusable state in `composables/`, all HTTP integrations behind `services/genesysApi.ts`, parsers in `helpers/`, calculations in `domain/`, and shared interfaces in `types/`.
- Use descriptive names, small focused functions and readable formatting (`npm run format`). Remove duplication.
- Use Tailwind utilities and shared classes in `src/style.css` for consistent light/dark colors, panels, buttons and inputs. This project uses Tailwind 3, so use its `@tailwind` / `@layer` syntax; do not paste Tailwind 4 directives into it.
- Prefer existing accessible controls and local utilities. Headless UI may be used where it meaningfully replaces substantial custom accessibility logic. Keep the tested dialog focus trap until a replacement has equivalent tests.
- Use Heroicons for appropriate icons. Only introduce custom SVG components in `icons/` if no suitable Heroicon exists. Decorative icons are hidden from assistive technology; icon buttons need accessible names.
- Minimize dependencies. Add one only with concrete value. No VueUse for small local utilities.
- Run tests, strict typecheck, static architecture checks and build. Keep reusable deployment and rollback instructions current. Never commit tenant data or secrets.
- PRs only; no automatic merge or deployment. `main` publishes. Preserve release recovery tags.
