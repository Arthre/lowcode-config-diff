# M3：Core Merge

**日期：** 2026-08-15  
**状态：** 已完成  
**依赖：** [总览](./2026-08-15-v0.1-config-diff-merge.md)、[M1](./2026-08-15-m1-core-parse.md)、[M2](./2026-08-15-m2-core-diff.md)  
**关联计划：** [`.docs/plans/archive/2026-08-15-m3-core-merge.md`](../plans/archive/2026-08-15-m3-core-merge.md)  
**影响模块：** `src/core/merge.ts`

---

## 背景与目标

按每叶 `side` 从 TEST / PROD **组装**最终 Config（产品无单一固定基线）。本切片无 UI。

---

## 需求变更

### + 新增

- [mergeConfig]：接收 test、prod 与带 `side` 的叶子列表，组装独立结果。
- [选边语义]：见下方 apply 表。
- [三种整体结果]：默认 side → TEST∪PROD独有；全部 `test` → ≡ TEST；全部 `prod` → ≡ PROD。
- [隔离]：不修改传入的 test / prod。

### ~ 修改（相对早期草案）

- [基线]：从「仅 deepClone(PROD) + 是否应用」改为「按叶选边组装」。
- [API]：签名需同时提供 test 与 prod（不再只传 prod + selectedLeaves）。

### 非目标（本切片）

- 实时预览 UI、复制/下载
- 三方 Merge（BASE）
- 接收展示用父节点

---

## 接口与规则

```ts
mergeConfig(
  testConfig: Config,
  prodConfig: Config,
  leaves: DiffItem[]  // 每项含最终 side；应覆盖本次 diff 的全部叶子
): Config
```

**选边 → 对该 path 的效果：**

| type     | side=`test`           | side=`prod`           |
| -------- | --------------------- | --------------------- |
| modified | 写入 `testValue`      | 写入 `prodValue`      |
| added    | 写入 `testValue`      | 不写入（删除该 path） |
| removed  | 不写入（删除该 path） | 写入 `prodValue`      |

**推荐实现（与产品语义等价）：**

1. `result = deepClone(testConfig)`
2. 对每个 `side === 'prod'` 的叶子按上表套用 PROD 语义（modified/removed 写入 prod 值；added 则删 path）
3. `side === 'test'` 的叶子在脚手架下多为 no-op（已与 TEST 一致）；若调用方传入的 leaves 不完整，不得静默假设——V0.1 要求传入完整 diff 叶子列表

**Apply 顺序：** 写入类（设值）按 path 深度升序；删除类按 path 深度降序。  
父 path 异常：抛出明确错误。  
不把 `downloadConfig` 放进 core。

**建议文件：** `src/core/merge.ts`

---

## 验收清单

1. 使用 M2 默认 side → 结果 deepEqual「TEST ∪ 仅 PROD 有」（冲突处为 TEST）。
2. 全部叶子 `side='test'` → 结果 deepEqual TEST。
3. 全部叶子 `side='prod'` → 结果 deepEqual PROD。
4. 部分改边 → 仅对应 path 体现另一方。
5. 原始 test / prod 内容不变；结果为独立对象。
6. 相关单测通过。

---

## 测试要点

默认合并；全 TEST；全 PROD；added+removed+modified 组合改边；不修改原对象。
