# AGENTS.md — LowCode Config Diff 协作指引

本文档是仓库级协作入口，面向人类开发者和所有 AI 助手。它只保留稳定事实、强制约束和文档导航；模块细节必须回到对应活文档确认。

## 信息源与优先级

遇到描述冲突时按以下顺序判断：

1. **代码与可执行配置**：`package.json`、`vite.config.ts`、环境文件和当前源码是运行事实。
2. **`.docs/`（主要文档）**：工作流、变更产物和模块活文档的长期真相源。
3. **业务旁文档**：若未来在业务目录旁放置实现约定（如 `src/**/docs/`），不得覆盖 `.docs/` 与当前代码中的冲突事实。
4. **本文件及 IDE 规则**：提供入口和约束，不复制易过期的实现行号、文件数量或注册项数量。

详细维护协议见 `.docs/MAINTENANCE.md`，工作流入口见 `.docs/workflows/README.md`。

## 项目概览

- **LowCode Config Diff**：低代码配置对比工具前端。
- 单包 Vite 应用（非 monorepo），包管理器为 **pnpm**。
- 技术栈：Vue 3、TypeScript、Vite、Vue Router、Pinia、Axios、UnoCSS、VueUse。
- 路径别名：`@` → `src/`（见 `vite.config.ts` / `tsconfig.app.json`）。

## 环境与命令

- Node：建议 `>=20.19`（本机开发以当前 LTS / 22.x 为准）
- pnpm：`>=10`（以 `package.json` / lockfile 实际版本为准）
- 仅允许 pnpm；首次安装执行 `pnpm install`

常用命令：

| 命令                 | 用途                        |
| -------------------- | --------------------------- |
| `pnpm dev`           | 启动开发服务器              |
| `pnpm build`         | 类型检查 + 生产构建         |
| `pnpm preview`       | 预览生产构建                |
| `pnpm lint`          | ESLint 检查                 |
| `pnpm lint:fix`      | ESLint 自动修复             |
| `pnpm format`        | Prettier 格式化             |
| `pnpm test`          | Vitest 监听模式             |
| `pnpm test:run`      | Vitest 单次运行（完成验证） |
| `pnpm test:coverage` | Vitest + 覆盖率             |

不要使用 npm 或 yarn，不要手工编造依赖版本。

## 环境变量

当前通过 Vite `import.meta.env` 读取；可选变量见 `src/vite-env.d.ts`。

| 变量                | 用途                                                     |
| ------------------- | -------------------------------------------------------- |
| `VITE_API_BASE_URL` | Axios 请求基址，默认 `/api`（见 `src/utils/request.ts`） |

本地覆盖可使用 `.env` / `.env.local` / `.env.development` 等（`.env*.local` 已忽略）。禁止把密钥、令牌或本地凭证写入仓库。

## 目录与业务边界

| 路径              | 职责                                         |
| ----------------- | -------------------------------------------- |
| `src/`            | 应用源码                                     |
| `src/views/`      | 页面视图                                     |
| `src/components/` | 通用组件                                     |
| `src/router/`     | 路由与导航守卫（含 NProgress）               |
| `src/stores/`     | Pinia 状态                                   |
| `src/utils/`      | 工具与请求封装                               |
| `src/types/`      | 自动生成类型声明（auto-import / components） |
| `public/`         | 静态资源                                     |
| `.docs/`          | 主要文档：工作流、specs、plans、模块活文档   |
| `.husky/`         | Git hooks（lint-staged、commitlint）         |
| `.cursor/`        | Cursor 规则等 IDE 薄层                       |

新增页面优先放 `src/views/`；可复用 UI 放 `src/components/`；跨页面状态放 `src/stores/`；HTTP 调用统一走 `src/utils/request.ts`（或后续抽离的 `src/api/`），页面内不要散落裸 `axios`。

## 开发工作流

开始任务前先阅读 `.docs/workflows/README.md` 并选择适用流程：

- 简单、明确的单点改动可跳过 specs/plans，但仍需验证并同步活文档。
- 有意义的功能或行为变更遵循：需求设计 → `.docs/specs/` → 实施计划 `.docs/plans/` → TDD 实施 → 审查与验证 → 同步模块活文档 → 归档计划。
- Bug 修复先按 `.docs/workflows/debugging.md` 定位根因，再以复现测试驱动修复。
- 声称完成前必须执行与改动风险相匹配的最新验证；不得仅依据旧输出或子代理结论。
- 不扩大任务范围，不顺手重构无关代码。

代码变更或分析中发现 `.docs` 与代码不一致时，按 `.docs/MAINTENANCE.md` 修正对应模块文档。文档只记录真实行为；不要把已知 bug 写成设计目标。

## CodeGraph 上下文协议

仓库存在 `.codegraph/` 时，代码探索遵循 `.docs/workflows/codegraph.md`：

1. 查看、分析或修改代码前，在仓库根目录运行 `codegraph index`。
2. 优先用 CodeGraph 的 `explore`、`search/query`、`node`、`callers`、`callees` 缩小范围。
3. 修改共享符号、公共组件、状态、路由或请求封装前，必须执行 `impact` 分析。
4. 改动后可用 CLI `codegraph affected <files...>` 辅助确定验证范围。
5. Markdown、配置、固定字符串、已知路径或索引未覆盖的动态信息可直接用读取/搜索工具确认。

不同 IDE 暴露的 MCP 工具名可能不同，以当前 MCP schema 为准，不得调用不存在的别名。

## 应用与编码约定

### Vue 与 TypeScript

- 使用 `<script setup lang="ts">`；需要组件名时可用 `name` 属性（`unplugin-vue-setup-extend-plus`）。
- 禁止无必要的 `any` 和非空断言 `!`；对外 API / 请求结果尽量声明类型。
- 优先使用 `type`，复杂对象可使用 `interface`。
- 页面副作用抽离到 composables；单文件逻辑过重时拆分并说明原因。

### 命名与导入

- 使用具体业务语义命名，避免无上下文的 `data`、`list`、`info`。
- 多参数复杂函数优先使用 Options 对象；完整规则见 `.docs/workflows/naming-convention.md`。
- 应用内导入优先使用 `@/*`，避免过深的相对路径（如 `../../../`）。
- `ref` / `computed` / VueUse 等可由 unplugin 自动导入；不要为“看起来完整”而重复手写无关 import。

### API 与状态

- 页面禁止直接 `import axios`；统一使用 `src/utils/request.ts`（或后续 `src/api/` 模块）。
- 状态使用 Pinia；store 放在 `src/stores/`。
- 通用副作用与浏览器能力优先使用 VueUse（`@vueuse/core`，可经 auto-import）。

### UI 与样式

- 样式优先 UnoCSS 原子类；全局样式放 `src/style.css`，避免无必要的深层耦合样式。

## Git 与验证

- 提交信息遵循 Conventional Commits（中文 subject/body），由 commitlint + husky `commit-msg` 校验；细则见 `.cursor/rules/commit-message.mdc`。
- husky `pre-commit` 对暂存文件执行 lint-staged（Prettier + ESLint）。
- 未经用户明确要求，不创建提交、不推送远端。
- 声称完成或合并前，按改动风险执行验证（详见 `.docs/workflows/verification.md`）：
  - 风格/规则：`pnpm lint`
  - 单元测试：`pnpm test:run`
  - 类型与构建：`pnpm build`
  - 不要使用其他仓库遗留命令（如 `pnpm dev:antd`、`pnpm check:type`）
- 单元测试 `describe` / `it` 说明使用中文（见 `.cursor/rules/unit-test-chinese.mdc`）。

## AI 代理硬约束

除非任务明确要求，禁止：

- 修改 lockfile、升级核心依赖或改动 CI。
- 批量格式化仓库、重构无关公共代码。
- 新增已有能力的重复组件或模块。
- 绕过失败的 lint、类型错误或 Git hooks 来声称完成。
- 编造未安装的依赖或其版本号。

包含中文或其他非 ASCII 字符的文件，禁止使用 PowerShell `Set-Content` / `Out-File` 写入；使用能保留编码的 patch/edit 工具。

## 文档导航

| 入口                   | 内容                             |
| ---------------------- | -------------------------------- |
| `.docs/MAINTENANCE.md` | AI 文档维护协议与文档结构        |
| `.docs/workflows/`     | 工作流协议（入口见 `README.md`） |
| `.docs/specs/`         | 变更设计文档（需求 delta）       |
| `.docs/plans/`         | 变更实施计划与 `archive/` 归档   |

模块活文档按需创建于 `.docs/{模块}/`；当前尚无模块文档时以代码与本文件为准。

## IDE 规则同步

- Cursor 规则：`.cursor/rules/`（如 `commit-message.mdc`、`unit-test-chinese.mdc`）
- VS Code / Cursor 工作区设置：`.vscode/settings.json`、`.vscode/extensions.json`
- 规则只保留激活条件、核心约束和主文档链接；详细行为以 `.docs/` 与当前代码为准。
- 若规则文件仍残留其他仓库业务描述，以本文件与 `.docs/` 为准，并择机清理规则内容。
