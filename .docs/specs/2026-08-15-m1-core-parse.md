# M1：Core Parse & Types

**日期：** 2026-08-15  
**状态：** 已完成  
**依赖：** [V0.1 总览](./2026-08-15-v0.1-config-diff-merge.md)  
**关联计划：** [`.docs/plans/archive/2026-08-15-m1-core-parse.md`](../plans/archive/2026-08-15-m1-core-parse.md)  
**影响模块：** `src/core/types.ts`、`path.ts`、`equal.ts`、`parse.ts`、`format.ts`

---

## 背景与目标

为 Diff/Merge 提供与 UI 无关的基础类型与 JSON 解析/格式化能力。本切片不实现 Diff 或 Merge。

**目标：** 能把字符串安全解析为 `Config`，能深相等比较与稳定格式化输出。

---

## 需求变更

### + 新增

- [JsonValue / Config]：递归 JSON 类型；**顶层 Config 为 object 或 array**（允许空 object / 空 array）。
- [parseConfig]：解析字符串；非法 JSON，或顶层为 `null` / primitive 时抛出明确错误（尽量带行/列）。
- [deepEqual]：语义深相等，忽略 object key 顺序；数组顺序敏感。
- [formatConfig]：`JSON.stringify(config, null, 2)` 等价的稳定可读文本。
- [path 工具]：`string[]` 的拼接/展示辅助（如 `formatPath`）；根 path `[]` 展示约定（如 `(root)`）；不以含 `.` 的展示串反解析为权威 path。

### ~ 修改

- [顶层约束]：从「必须为 object」改为「object 或 array 均可」；仍拒绝顶层 `null` 与 primitive。

### 非目标（本切片）

- `diffConfig` / `mergeConfig`
- DOM 下载、剪贴板
- UI、Vue 依赖

---

## 接口与规则

```ts
type JsonPrimitive = string | number | boolean | null;

type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

/** 配置根：object 或 array */
type Config = { [key: string]: JsonValue } | JsonValue[];

parseConfig(input: string): Config
formatConfig(config: Config): string
// equal / path 按文件导出具体函数名，实施 plan 中写死签名
```

- 解析后不保留 `undefined`；值中的 `null` 合法。
- 两侧根类型可不同（如一边 object、一边 array）：属合法 Config，差异由 M2 按类型变迁 / 整段规则处理。
- Core 禁止依赖 Vue / Pinia / DOM。

**建议文件：**

```text
src/core/types.ts
src/core/path.ts
src/core/equal.ts
src/core/parse.ts
src/core/format.ts
```

---

## 验收清单

1. 合法 object JSON → `Config`。
2. 合法 array JSON（含空数组）→ `Config`。
3. 非法 JSON → 明确错误（非静默）。
4. 顶层 `null` / string / number / boolean → 失败。
5. `{a:1,b:2}` 与 `{b:2,a:1}` deepEqual 为 true。
6. `[1,2]` 与 `[2,1]` deepEqual 为 false。
7. `formatConfig` 对 object / array 均缩进 2，可再 parse 回等价 Config。
8. 单测中文描述；`pnpm test:run` 覆盖本切片通过。

---

## 测试要点

非法 JSON；顶层 null/primitive 拒绝；顶层 object 与 array 接受；空 object / 空 array；含 null；key 顺序无关相等；format 往返。
