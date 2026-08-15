# Core 模块

纯 TypeScript Diff/Merge 基础能力，**禁止**依赖 Vue / Pinia / DOM。

## 当前状态（M1 已完成）

| 文件                 | 职责                                                          |
| -------------------- | ------------------------------------------------------------- |
| `src/core/types.ts`  | `JsonPrimitive` / `JsonValue` / `Config` / `ParseConfigError` |
| `src/core/equal.ts`  | `deepEqual`（忽略 object 键序，数组顺序敏感）                 |
| `src/core/path.ts`   | `formatPath`（`[]` → `(root)`）                               |
| `src/core/parse.ts`  | `parseConfig` / `isConfig`（根为 object 或 array）            |
| `src/core/format.ts` | `formatConfig`（缩进 2）                                      |

规格：[`.docs/specs/2026-08-15-m1-core-parse.md`](../specs/2026-08-15-m1-core-parse.md)  
计划（已归档）：[`.docs/plans/archive/2026-08-15-m1-core-parse.md`](../plans/archive/2026-08-15-m1-core-parse.md)

## 尚未实现

M2 `diffConfig`、M3 `mergeConfig` 及后续 UI 切片。

## 验证

```bash
pnpm test:run src/core
```
