---
name: git-commit
description: 'Execute git commit with conventional commit message analysis, intelligent staging, and message generation. Use when user asks to commit changes, create a git commit, or mentions "/commit". Supports: (1) Auto-detecting type and scope from changes, (2) Generating conventional commit messages from diff, (3) Interactive commit with optional type/scope/description overrides, (4) Intelligent file staging for logical grouping'
license: MIT
allowed-tools: Bash
---

# Git Commit with Conventional Commits

## Overview

Create standardized, semantic git commits using the Conventional Commits specification. Analyze the actual diff to determine appropriate type, scope, and message.

## Conventional Commit Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Commit Types

| Type       | Purpose                        |
| ---------- | ------------------------------ |
| `feat`     | New feature                    |
| `fix`      | Bug fix                        |
| `docs`     | Documentation only             |
| `style`    | Formatting/style (no logic)    |
| `refactor` | Code refactor (no feature/fix) |
| `perf`     | Performance improvement        |
| `test`     | Add/update tests               |
| `build`    | Build system/dependencies      |
| `ci`       | CI/config changes              |
| `chore`    | Maintenance/misc               |
| `revert`   | Revert commit                  |

## Breaking Changes

```
# Exclamation mark after type/scope
feat!: remove deprecated endpoint

# BREAKING CHANGE footer
feat: allow config to extend other configs

BREAKING CHANGE: `extends` key behavior changed
```

## Workflow

### 1. Analyze Diff

```bash
# If files are staged, use staged diff
git diff --staged

# If nothing staged, use working tree diff
git diff

# Also check status
git status --porcelain
```

### 2. Split Confirmation（可拆分时必须先问）

分析 working tree / 暂存区后，若变更**可以**拆成多个逻辑独立的 commit（例如无关模块、feat+chore 混杂、业务改动与纯 lint/配置）：

1. **先停下来**，在回复正文里简要列出拟拆分方案（每个 commit 的 type、中文 subject 草稿、包含文件）
2. **用运行时选项让用户点选**（优先 `AskQuestion`，每条助手消息最多一次）：
   - 单选问题示例：`本次提交如何处理？`
   - 固定选项至少包含：
     - `拆成多个 commit`（按上面方案拆分）
     - `合并成 1 个 commit`
     - `调整分组（我说明）`（选后等用户文字说明，勿直接提交）
   - 选项 label 保持短；方案细节放在正文，不要塞进过长的 option 文案
3. **未得到确认前不得执行** `git add` / `git commit`
4. 用户点选或明确回复后再继续

若当前会话**没有** `AskQuestion` 工具：用简短正文列出同样的固定选项，等用户回复；不要假装已弹出 UI。

仅当变更明显是**单一逻辑改动**时，可直接拟一条 message 并征得提交确认（或按用户「直接提交」执行），无需拆分选项。

### 3. Stage Files (if needed)

If nothing is staged or you want to group changes differently:

```bash
# Stage specific files
git add path/to/file1 path/to/file2

# Stage by pattern
git add *.test.*
git add src/components/*
```

**Never commit secrets** (.env, credentials.json, private keys).
**Never use** `git add -p` / `git add -i`（交互式暂存在本环境不可用）。

### 4. Generate Commit Message

Analyze the diff to determine:

- **Type**: What kind of change is this?
- **Scope**: 默认不写；确需时须符合仓库 commitlint 允许列表
- **Description**: 简体中文 subject（见 `.cursor/rules/commit-message.mdc`）
- **Body**: 简体中文，说明怎么做 / 为何 / 影响范围；注意 commitlint 行宽

### 5. Execute Commit

```bash
# Single line
git commit -m "<type>: <中文 subject>"

# Multi-line with body/footer
git commit -m "$(cat <<'EOF'
<type>: <中文 subject>

<中文 body>

EOF
)"
```

PowerShell 可用 here-string 等价写法；message 必须符合 `.cursor/rules/commit-message.mdc`。

## Best Practices

- One logical change per commit（可拆时先问用户，不要擅自拆或擅自合并）
- Present tense: "add" not "added"
- Imperative mood: "fix bug" not "fixes bug"
- Reference issues: `Closes #123`, `Refs #456`
- Keep description under 72 characters；body 单行不超过 commitlint 限制（通常 100）

## Git Safety Protocol

- NEVER update git config
- NEVER run destructive commands (--force, hard reset) without explicit request
- NEVER skip hooks (--no-verify) unless user asks
- NEVER force push to main/master
- If commit fails due to hooks, fix and create NEW commit (don't amend)
