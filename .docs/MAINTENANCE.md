# AI 自主学习与文档维护协议

> **本文件是给所有 AI 助手的指令文件，不限平台、不限模型。** 任何 AI 在参与本项目开发时，都必须遵循以下协议。

## 核心原则

**每次完成代码变更后，必须自主学习变更内容，并同步更新 `.docs/` 下的对应文档。**

如果在审查、调试或纯分析过程中发现**代码已经和 `.docs/` 描述不一致**，也必须主动更新对应文档；这类文档修正不需要等待后续代码改动。

这不是可选的，而是开发流程的一部分。

---

## 执行流程

### 第零步：CodeGraph 更新与上下文定位

每次查看代码、分析实现、调试或修改代码之前（不是仅任务开始时一次），必须先在项目根目录运行：

```bash
codegraph index
```

随后优先使用 CodeGraph 工具建立上下文，再结合常规读取、搜索和编辑工具（**先更新、后查看，顺序不可颠倒**）：

- 用 `codegraph explore` 理解功能区域、调用链和相关源码。
- 用 `codegraph query` / `codegraph node` 定位符号、文件和上下游关系。
- 修改共享符号前，用 `codegraph impact` 分析影响范围。
- CodeGraph 未覆盖 Markdown、配置或动态运行时信息时，再用常规工具补充。

### 第一步：变更前 — 阅读现有文档

在动手写代码之前，先阅读 `.docs/` 下与即将修改的模块相关的文档，理解当前的架构和设计决策。

### 第二步：变更中 — 正常开发

按需求完成代码变更，遵循 `.docs/workflows/` 中定义的工作流。实现前须按 [代码简化](./workflows/simplification.md) 走决策阶梯选最少方案；每次代码变更完成后、完成验证前，再完成行为等价的局部精简。

### 第三步：变更后 — 自主学习并更新文档

1. **分析影响范围**：本次变更涉及了哪些模块？影响了哪些数据流？
2. **检查文档覆盖**：`.docs/` 下是否已有对应文档？
3. **精准更新**：
   - 新增了类型/函数/组件 → 补充到对应文档
   - 修改了逻辑/接口/数据流 → 更新对应段落
   - 删除了代码 → 从文档中移除过时内容
   - 新增了全新模块 → 创建新文档
   - 架构级变化 → 更新模块的 README.md
4. **验证一致性**：确保文档描述与最新代码一致

### 分析/审查中发现文档漂移

当没有亲自修改代码，但通过 `git diff`、代码审查、调试定位或功能梳理发现文档落后于代码时：

1. 先确认差异属于已存在代码事实，而不是待确认需求。
2. 定位 `.docs/` 下最接近的模块文档。
3. 用维护记录或对应章节补充当前真实行为、边界条件和已知风险。
4. 如果发现的是明显 bug，不要把 bug 写成设计目标；应以“当前实现注意 / 待修正风险”描述，避免误导后续开发。

---

## 工作流自更新

`.docs/workflows/` 下的开发工作流也需要持续维护：

- **发现更好的实践** → 更新对应工作流文档
- **发现过时内容** → 修正或移除
- **项目新增工具/流程** → 创建新工作流文档并更新 `workflows/README.md` 索引
- **技术栈变化** → 更新 `docs-lookup.md` 中的技术栈列表

工作流文档与组件文档的更新遵循相同原则：**只改相关内容，不做无关修改。**

---

## 文档结构约定

```
.docs/
├── MAINTENANCE.md              ← 你正在读的这个文件（AI 协议）
├── specs/                      ← 变更设计文档（含需求 delta）
│   └── YYYY-MM-DD-<主题>.md
├── plans/                      ← 变更实施计划
│   ├── YYYY-MM-DD-<主题>.md
│   └── archive/                ← 已完成变更归档
├── workflows/                  ← 开发工作流（借鉴 Superpowers，见 workflows/README.md）
│   ├── README.md               ← 总览与决策树
│   ├── using-workflows.md      ← 工作流优先
│   ├── change-lifecycle.md     ← 变更生命周期
│   ├── brainstorming.md        ← 需求设计
│   ├── git-worktrees.md        ← Git 工作树隔离
│   ├── writing-plans.md        ← 编写计划
│   ├── subagent-driven-development.md ← 子代理驱动开发
│   ├── executing-plans.md      ← 执行计划
│   ├── tdd.md / simplification.md / debugging.md / code-review.md / verification.md
│   ├── finishing-branch.md / parallel-tasks.md / codegraph.md
│   └── docs-lookup.md / naming-convention.md
└── {组件目录名}/               ← 模块活文档（长期真相源）
    ├── README.md               ← 模块架构总览、数据流、设计决策
    └── *.md                    ← 按模块拆分的详细文档
```

### 变更产物与模块文档的分工

| 目录      | 职责                           | 生命周期                    |
| --------- | ------------------------------ | --------------------------- |
| `specs/`  | 单次变更的设计意图与需求 delta | 永久保留，状态标记已完成    |
| `plans/`  | 单次变更的可执行任务清单       | 完成后移至 `plans/archive/` |
| `{模块}/` | 模块当前架构与行为的真相源     | 持续维护，随代码演进        |

实施完成后必须将 specs 中的 delta 同步到 `{模块}/` 活文档。详见 [变更生命周期](./workflows/change-lifecycle.md)。

### 新模块文档创建规则

当项目新增一个重要组件/模块时：

1. 在 `.docs/` 下创建对应子目录
2. 至少包含一个 `README.md` 描述模块的职责、架构、核心数据流
3. 根据模块复杂度决定是否拆分为多个文档文件

---

## 文档编写规范

### 侧重点

- **架构关系**：模块间如何协作，数据如何流转
- **设计决策**：为什么这样设计，有哪些权衡
- **核心接口**：关键的类型定义、函数签名、Store API
- **交互流程**：用户操作 → 组件响应 → 数据变化 的完整链路

### 避免

- 不要逐行翻译代码，文档不是代码注释的堆砌
- 不要包含具体实现细节，除非是关键算法或非直觉的逻辑
- 不要堆砌完整源码，用简短的签名或伪代码说明

### 格式

- 使用中文编写
- 使用 Markdown 格式
- 表格用于 API 列表、配置项等结构化内容
- 代码块用于类型签名、关键接口、架构图（ASCII）

---

## 现有文档索引

### 开发工作流（`.docs/workflows/`）

| 文档                   | 说明                                          | 来源                                          |
| ---------------------- | --------------------------------------------- | --------------------------------------------- |
| `README.md`            | 工作流总览与决策树                            | —                                             |
| `change-lifecycle.md`  | 变更生命周期（探索→提案→计划→实施→同步→归档） | 借鉴 OpenSpec OPSX                            |
| `codegraph.md`         | CodeGraph 上下文协议                          | colbymchenry/codegraph                        |
| `brainstorming.md`     | 需求设计                                      | Superpowers: brainstorming                    |
| `writing-plans.md`     | 编写实施计划                                  | Superpowers: writing-plans                    |
| `executing-plans.md`   | 执行实施计划                                  | Superpowers: executing-plans                  |
| `tdd.md`               | 测试驱动开发                                  | Superpowers: test-driven-development          |
| `debugging.md`         | 系统化调试                                    | Superpowers: systematic-debugging             |
| `simplification.md`    | 每次代码变更后的强制局部简化                  | 项目规范                                      |
| `code-review.md`       | 推荐代码审查（固定基准、规范轴 + 需求轴）     | Superpowers: requesting/receiving-code-review |
| `verification.md`      | 完成验证                                      | Superpowers: verification-before-completion   |
| `finishing-branch.md`  | 分支收尾                                      | Superpowers: finishing-a-development-branch   |
| `parallel-tasks.md`    | 并行任务调度                                  | Superpowers: dispatching-parallel-agents      |
| `docs-lookup.md`       | 文档查询协议                                  | Context7 MCP                                  |
| `naming-convention.md` | 命名规范：语义化拟人化                        | 项目编码规范                                  |

### 变更产物（`.docs/specs/`、`.docs/plans/`）

| 目录             | 说明                                                         |
| ---------------- | ------------------------------------------------------------ |
| `specs/`         | 变更设计文档，含需求 delta（`+ 新增` / `~ 修改` / `- 移除`） |
| `plans/`         | 变更实施计划，TDD 细粒度任务清单                             |
| `plans/archive/` | 已完成并验证通过的变更计划归档                               |

### 模块活文档

模块活文档按需创建于 `.docs/{模块}/`，本索引随文档增减同步更新。当前尚无模块文档。
