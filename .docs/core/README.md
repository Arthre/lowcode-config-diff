# Core 模块

纯 TypeScript Diff/Merge 基础能力，**禁止**依赖 Vue / Pinia / DOM。

## 当前状态（M1 / M2 / M3 已完成）

| 文件                 | 职责                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `src/core/types.ts`  | `Json*` / `Config` / `ParseConfigError`；`DiffType` / `DiffSide` / `DiffItem`                 |
| `src/core/equal.ts`  | `deepEqual`（忽略 object 键序，数组顺序敏感）                                                 |
| `src/core/path.ts`   | `formatPath`（`[]` → `(root)`）                                                               |
| `src/core/parse.ts`  | `parseConfig` / `isConfig`（根为 object 或 array）                                            |
| `src/core/format.ts` | `formatConfig`（缩进 2）                                                                      |
| `src/core/diff.ts`   | `diffConfig`（叶子 Diff + 默认 side；数组整段比较在本文件内，无独立 `array.ts`）              |
| `src/core/merge.ts`  | `mergeConfig`（按叶 `side` 从 TEST/PROD 组装；内部 deepClone / path 设删，无独立 `clone.ts`） |

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

## 尚未实现（Core）

无。后续 UI 切片见 [`.docs/ui/README.md`](../ui/README.md)；M5 Diff 树 / M6 预览导出仍待实现。

## 测试命名

单测与源文件同目录、同基名：`equal.ts` → `equal.test.ts`。不要按函数名另起文件（如 `diffConfig.test.ts`）。纯类型文件 `types.ts` 不单独建测，行为在 `parse` / `diff` / `merge` 的测试中覆盖。

## 验证

```bash
pnpm test:run src/core
```
