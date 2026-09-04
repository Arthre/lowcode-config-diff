# AI 工作流协议总览

> 本目录定义了所有 AI 助手在本项目中必须遵循的开发工作流。 **平台无关** — 无论使用 Cursor、Claude Code、Copilot、Codex 或任何其他 AI 平台，这些工作流均适用。
>
> **方法论来源**：[Superpowers](https://github.com/obra/superpowers) — agentic skills 框架与软件开发方法论。本项目将其本地化，并叠加 CodeGraph、需求 Delta、模块活文档等项目约定。

## 工作流索引

| 文档                                               | 触发时机                                               | 优先级   |
| -------------------------------------------------- | ------------------------------------------------------ | -------- |
| [工作流优先](./using-workflows.md)                 | 开始任何对话、任务或响应之前                           | 最高     |
| [CodeGraph 上下文](./codegraph.md)                 | 开始查看代码、分析实现、调试或修改代码之前             | 最高     |
| [变更生命周期](./change-lifecycle.md)              | 任何涉及代码改动的需求                                 | 最高     |
| [需求设计](./brainstorming.md)                     | 创造性工作之前（新功能、新组件、行为修改）             | 最高     |
| [Git 工作树隔离](./git-worktrees.md)               | 设计确认后、执行计划之前                               | 高       |
| [编写计划](./writing-plans.md)                     | 设计确认后、编码之前                                   | 高       |
| [子代理驱动开发](./subagent-driven-development.md) | 有计划、任务独立、当前会话执行（**推荐**）             | 高       |
| [执行计划](./executing-plans.md)                   | 有计划、需内联执行或人工检查点                         | 高       |
| [测试驱动开发](./tdd.md)                           | 实现任何功能或修复 bug 时                              | 高       |
| [代码简化](./simplification.md)                    | 实现前决策阶梯；每次代码变更完成后、完成验证前局部精简 | **强制** |
| [系统化调试](./debugging.md)                       | 遇到 bug、测试失败、异常行为时                         | 高       |
| [代码审查](./code-review.md)                       | 任务间、完成重要功能、合并前或高风险变更时             | 推荐     |
| [完成验证](./verification.md)                      | 声称工作完成之前                                       | 高       |
| [分支收尾](./finishing-branch.md)                  | 实现完毕、准备合并时                                   | 中       |
| [并行任务](./parallel-tasks.md)                    | 有 2+ 个独立任务可并行处理时                           | 按需     |
| [文档查询](./docs-lookup.md)                       | 需要查询库/框架最新文档时                              | 按需     |
| [命名规范](./naming-convention.md)                 | 写任何新变量/函数名时                                  | 始终     |

## 基础工作流（Superpowers 核心链路）

有意义的功能开发按以下顺序执行：

```
1. brainstorming     → 需求设计，保存 specs/
2. git-worktrees     → 隔离工作区，验证干净基线
3. writing-plans     → 编写计划，保存 plans/
4. subagent-driven   → 子代理逐任务执行 + 两阶段审查（推荐）
   或 executing-plans → 内联执行 + 人工检查点
5. tdd               → 每个任务 RED-GREEN-REFACTOR
6. simplification    → 实现前决策阶梯 + 实现后局部、行为等价精简（强制）
7. verification      → 证据验证后才能声称完成
8. code-review       → 推荐：固定基准的规范轴 + 需求轴审查
9. sync + archive + finishing-branch → 收尾
```

**简单改动**（单行修复、改文案、明确单点）可跳过 specs，聊天确认后直接 TDD。

## 工作流选择决策树

```
收到用户需求
   │
   ├─ 先检查适用工作流（using-workflows）
   │
   ├─ 涉及代码改动？
   │   └─ → codegraph index → CodeGraph 建上下文 → 阅读模块活文档
   │         │
   │         ├─ 简单改动？（单行修复、改文案、明确单点）
   │         │   └─ → 聊天确认 → 直接 TDD 实现 → 更新模块文档
   │         │
   │         └─ 有意义变更？
   │             └─ → brainstorming 探索 → 输出方案（含需求 delta）→ 保存 specs/
   │                   │
   │                   ├─ 用户有疑问/要求调整？
   │                   │   └─ → 回写 specs → 重新生成最终版方案 → 再次等待确认
   │                   │
   │                   └─ 用户确认执行？
   │                       └─ → git-worktrees 隔离
   │                             → 编写 plans/ → 选择执行模式
   │                                   │
   │                                   ├─ 子代理驱动（推荐）→ 逐任务派发 + 审查
   │                                   └─ 内联执行 → 批次执行 + 检查点
   │                             │
   │                             └─ → 代码简化（强制）→ 完成验证
   │                                   → 代码审查（推荐：重要功能、合并前、高风险变更）
   │                                   → sync + archive + finishing-branch
   │
   │                             └─ 实施中发现偏差？
   │                                 └─ → 回写 specs/plans → 继续执行
   │
   ├─ 修 bug？
   │   └─ → debugging（四阶段根因调查）→ TDD 修复
   │
   └─ 纯查询/分析？
       ├─ 涉及查看代码？ → codegraph index → CodeGraph 建上下文 → 回答
       └─ 不涉及代码？ → 直接回答

实现代码时：
   └─ → simplification 决策阶梯（实现前）→ TDD
        → simplification 局部精简（实现后，强制）→ verification（证据验证）
        → code-review（推荐，含过度工程检查）→ sync 模块活文档 → archive 计划 → finishing-branch
```

## 核心原则

1. **工作流优先** — 任何行动前先检查适用工作流，不可合理化跳过
2. **CodeGraph 先行** — 每次查看或修改代码前，先运行 `codegraph index` 更新，再用 CodeGraph 工具查看相关内容（先更新、后查看）
3. **变更产物落盘** — 有意义变更必须保存到 `.docs/specs/` 和 `.docs/plans/`，不让规划只留在聊天里
4. **需求 Delta** — specs 文档用 `+ 新增` / `~ 修改` / `- 移除` 描述相对现状的需求变化
5. **设计先行** — 不要跳过需求分析直接写代码
6. **隔离开发** — 有意义变更在独立 worktree/分支上执行
7. **子代理驱动** — 有计划时优先子代理逐任务执行 + 两阶段审查
8. **历史先行** — 方案前必须回看既有需求/功能并先确认影响清单
9. **流体迭代** — 实施中发现偏差，随时回写 specs/plans
10. **测试先行** — 先写失败的测试，再写实现；先写的代码必须删除重来
11. **证据先行** — 声称完成前必须有新鲜验证证据
12. **局部简化** — 实现前走决策阶梯；实现后、验证前做行为等价精简
13. **同步归档** — 验证通过后 sync 模块活文档，archive 计划
14. **根因先行** — 调试时先找根因，不猜测修复
15. **YAGNI** — 不需要的功能不要加；优先复用与最少自建代码
16. **DRY** — 不要重复自己
17. **先读懂再偷懒** — 缩短实现，不缩短阅读、测试与责任
18. **默认修改** — 新建 `src/` 源文件须举证错位理由；未在计划列出不得擅自建文件（见 simplification / writing-plans）

## 哲学

- **测试驱动开发** — 先写测试，始终如此
- **系统化优于随意** — 流程优于猜测
- **降低复杂度** — 简洁是首要目标；最好的代码往往是没写出来的部分
- **先读懂再偷懒** — 懒的是方案，不是理解与责任
- **证据优于声称** — 验证通过后才能声明完成

## 与上游方法论的映射

| 上游来源                                                                  | 本项目工作流                                                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Superpowers `using-superpowers`                                           | [using-workflows](./using-workflows.md)                                          |
| Superpowers `brainstorming`                                               | [brainstorming](./brainstorming.md)                                              |
| Superpowers `using-git-worktrees`                                         | [git-worktrees](./git-worktrees.md)                                              |
| Superpowers `writing-plans`                                               | [writing-plans](./writing-plans.md)                                              |
| Superpowers `subagent-driven-development`                                 | [subagent-driven-development](./subagent-driven-development.md)                  |
| Superpowers `executing-plans`                                             | [executing-plans](./executing-plans.md)                                          |
| Superpowers `test-driven-development`                                     | [tdd](./tdd.md)                                                                  |
| [ponytail](https://github.com/DietrichGebert/ponytail) 决策阶梯（本地化） | [simplification](./simplification.md)（实现前阶梯 + 实现后精简；不引入插件命令） |
| Superpowers `systematic-debugging`                                        | [debugging](./debugging.md)                                                      |
| Superpowers `requesting-code-review` / `receiving-code-review`            | [code-review](./code-review.md)（含过度工程可删清单）                            |
| Superpowers `verification-before-completion`                              | [verification](./verification.md)                                                |
| Superpowers `finishing-a-development-branch`                              | [finishing-branch](./finishing-branch.md)                                        |
| Superpowers `dispatching-parallel-agents`                                 | [parallel-tasks](./parallel-tasks.md)                                            |
| —                                                                         | [codegraph](./codegraph.md)（本项目特有）                                        |
| —                                                                         | [change-lifecycle](./change-lifecycle.md)（本项目特有）                          |
