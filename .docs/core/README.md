# Core 模块

纯 TypeScript Diff/Merge 基础能力，**禁止**依赖 Vue / Pinia / DOM。

## 当前状态

| 文件                 | 职责                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `src/core/types.ts`  | `Json*` / `Config` / `ParseConfigError`；`DiffType` / `DiffSide` / `DiffItem`                 |
| `src/core/equal.ts`  | `deepEqual`（忽略 object 键序，数组顺序敏感）                                                 |
| `src/core/path.ts`   | `formatPath`（`[]` → `(root)`）                                                               |
| `src/core/parse.ts`  | `parseConfig` / `isConfig`（根为 object 或 array）                                            |
| `src/core/format.ts` | `formatConfig`（缩进 2）；`compressConfig`（无缩进）                                          |
| `src/core/diff.ts`   | `diffConfig`（叶子 Diff + 默认 side；数组整段比较在本文件内，无独立 `array.ts`）              |
| `src/core/merge.ts`  | `mergeConfig`（按叶 `side` 从 TEST/PROD 组装；内部 deepClone / path 设删，无独立 `clone.ts`） |

### 与现行 UI 的关系

- **仍被 UI 间接使用：** `parseConfig` / `formatConfig`（经 `useJsonDocument` → 导入格式化与右栏导出提示）
- **备用、UI 不调用：** `diffConfig` / `mergeConfig` 及叶级选边模型；主路径文本合并由 CodeMirror `MergeView` 完成。引擎与单测保留，不删

### Diff 类型（`types.ts`）

- `DiffType`：`'added' | 'removed' | 'modified'`
- `DiffSide`：`'test' | 'prod'`
- `DiffItem`：含 `id` / `path` / `type` / `testValue?` / `prodValue?` / `side` / `valueType?` / `arrayMode?: 'whole'`

规格：

- M1：[`.docs/specs/2026-08-15-m1-core-parse.md`](../specs/2026-08-15-m1-core-parse.md)
- M2：[`.docs/specs/2026-08-15-m2-core-diff.md`](../specs/2026-08-15-m2-core-diff.md)
- M3：[`.docs/specs/2026-08-15-m3-core-merge.md`](../specs/2026-08-15-m3-core-merge.md)

计划（已归档）：

- [`.docs/plans/archive/2026-08-15-m1-core-parse.md`](../plans/archive/2026-08-15-m1-core-parse.md)
- [`.docs/plans/archive/2026-08-15-m2-core-diff.md`](../plans/archive/2026-08-15-m2-core-diff.md)
- [`.docs/plans/archive/2026-08-15-m3-core-merge.md`](../plans/archive/2026-08-15-m3-core-merge.md)

现行 UI 主路径见 [`.docs/ui/README.md`](../ui/README.md)。

## 测试命名

项目统一使用 **`.test.ts`** 后缀（不用 `.spec.ts`）。
单测与源文件同目录、同基名：`equal.ts` → `equal.test.ts`。不要按函数名另起文件（如 `diffConfig.test.ts`）。纯类型文件 `types.ts` 不单独建测，行为在 `parse` / `diff` / `merge` 的测试中覆盖。

## 验证

```bash
pnpm test:run src/core
```
