# Git 工作树隔离（Git Worktrees）

> **触发时机**：开始需要隔离的功能开发，或执行实施计划之前。 **借鉴来源**：[Superpowers `using-git-worktrees`](https://github.com/obra/superpowers/blob/main/skills/using-git-worktrees/SKILL.md)，已适配本项目。

## 核心原则

确保工作在隔离的工作区中进行。优先使用平台原生隔离工具，其次才用手动 `git worktree`。

**宣布开始**："使用 git-worktrees 工作流设置隔离工作区。"

## 第 0 步：检测已有隔离

创建任何东西之前，先检查是否已在隔离工作区：

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

**子模块守卫**：`GIT_DIR != GIT_COMMON` 在子模块内也为真。先确认不在子模块中：

```bash
git rev-parse --show-superproject-working-tree 2>/dev/null
```

| 情况                                    | 动作                              |
| --------------------------------------- | --------------------------------- |
| `GIT_DIR != GIT_COMMON`（且非子模块）   | 已在 linked worktree，跳到第 2 步 |
| `GIT_DIR == GIT_COMMON`（或在子模块内） | 普通 checkout，继续第 1 步        |

## 第 1 步：创建隔离工作区

### 1a. 平台原生工具（优先）

如果平台提供原生 worktree 工具（如 Cursor 的 worktree 功能、`EnterWorktree` 等），**优先使用**，不要手动 `git worktree add`。

### 1b. Git Worktree 回退

仅在没有原生工具时使用。

**目录优先级**（用户明确偏好 > 已有目录 > 默认）：

1. 用户/项目指令中声明的目录
2. 项目已有的 `.worktrees/`（优先）或 `worktrees/`
3. 默认 `.worktrees/`

**安全验证**（项目本地目录必须被 gitignore）：

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

若未被忽略：先加入 `.gitignore` 并提交，再创建 worktree。

```bash
path="$LOCATION/$BRANCH_NAME"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**沙箱回退**：若 `git worktree add` 因权限失败，告知用户并在当前目录继续。

## 第 2 步：项目初始化

自动检测并运行项目设置：

```bash
# 本项目（单包 Vite + Vue 应用）
if [ -f package.json ]; then pnpm install; fi
```

## 第 3 步：验证干净基线

按 [完成验证](./verification.md) 确认工作区起点干净：

```bash
pnpm lint
pnpm test:run
pnpm build   # 涉及类型/构建面时建议执行
```

- 验证失败 → 报告失败，询问是否继续
- 验证通过 → 报告就绪

```
Worktree 就绪：<完整路径>
验证通过（pnpm lint / pnpm test:run / pnpm build）
可以开始实现 <功能名>
```

## 红线

- 第 0 步检测到已有隔离时，**不要**再创建 worktree
- 有原生工具时，**不要**用 `git worktree add`
- 项目本地 worktree 目录**必须**在 `.gitignore` 中
- 基线验证失败时，**不要**未经确认就继续
- **未经用户明确同意，不要在 main/master 上直接开始实现**

## 集成

- [编写计划](./writing-plans.md) 完成后、执行前
- [子代理驱动开发](./subagent-driven-development.md) 的前置条件
- [执行计划](./executing-plans.md) 的前置条件
