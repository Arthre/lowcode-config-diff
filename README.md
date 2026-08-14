# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## Scripts

- `pnpm dev` — start dev server
- `pnpm build` — type-check and build
- `pnpm lint` / `pnpm lint:fix` — ESLint check / auto-fix
- `pnpm format` — Prettier format

## Git commit convention

Follow [Conventional Commits](https://www.conventionalcommits.org/). Subject may be Chinese.

```text
<type>(optional-scope): <subject>

feat: 新增配置对比页面
fix(diff): 修复深层对象比较遗漏
docs: 更新 README
```

Common types: `feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `chore` / `ci` / `build` / `revert`.

Hooks (husky):

- `commit-msg` — commitlint validates the message
- `pre-commit` — lint-staged runs Prettier + ESLint on staged files
