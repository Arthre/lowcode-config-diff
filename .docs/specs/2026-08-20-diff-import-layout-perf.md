# 导入后目录定位性能

**日期：** 2026-08-20  
**状态：** 已完成  
**依赖：** [工作台胶囊栏头与分层目录](./2026-08-20-workbench-capsules-directory.md)  
**影响模块：** `jsonPathOffset`、`lineNumberAtOffset`、`jumpLineNumbers`、`TwoWayMergeEditor`

---

## 背景与目标

**现行：** 两侧文档变化后 `refreshConfigItemGroups` 会 `diffConfigItems`，再对每个配置项组 / 字段调用 `jsonPathOffset` 与 `lineNumberAtOffset` 生成跳转偏移和 `L{n}`。点击跳转仍可单次定位。

Chrome 追踪（`Trace-20260820T182405.json.gz`，拖入后 `reader.onload` ≈ 786ms）显示：

| 路径                                                                            | inclusive                |
| ------------------------------------------------------------------------------- | ------------------------ |
| `syncEditorChrome` → `refreshConfigItemGroups`                                  | ≈ 645ms                  |
| 其中 `buildJumpLineNumberMaps`                                                  | ≈ 562ms                  |
| 自时：`skipValueAt` / `readString` / `charAt` / `skipWs` / `lineNumberAtOffset` | 合计 ≈ 1s 级（多次扫描） |

根因：每个 path 都从文首扫描，跳过兄弟子树时还把字符串完整拼出来；组偏移与行号 map 各扫一遍。Myers 行 diff 与 `collapseUnchanged` 不是这次热点。

**目标：** 导入 / 编辑后目录偏移与行号语义不变，定位从「每 path 一遍全文」改为「每份文档至多一遍」。

---

## 需求变更

### ~ 修改

- `jsonPathOffsets(source, paths)`：同一份源文本上一次遍历收下全部 path；跳过值时不分配字符串；全部命中后立刻停止。空 path 仍为 0。
- `jsonPathOffset` 保持公开 API，语义与现单测一致（可委托批量实现）。
- 行号：对同一份文档建换行起点索引，按偏移二分；禁止对每个偏移从文首数 `\n`。
- `buildJumpLineNumberMaps` 一次定位组/字段，并返回 `groupOffsets`；`refreshConfigItemGroups` 不得再对组 path 重复 `jsonPathOffset`。
- 点击单字段 / 缓存未命中组仍可单次 `jsonPathOffset`。

### 非目标

- 不改目录文案、分组规则、跳转侧（删除看参考，其余看目标）
- 不改 Core、不启用 `collapseUnchanged`、不把定位搬进 Worker

---

## 验收清单

1. 既有 `jsonPathOffset` / `lineNumberAtOffset` / `buildJumpLineNumberMaps` 单测仍通过
2. 多 path 批量结果与逐个 `jsonPathOffset` 一致（含共享前缀、缺 path、空 path）
3. 导入或编辑后目录 `L{n}` 与组跳转仍落在正确行
4. `pnpm lint` / `pnpm test:run` / `pnpm build` 通过
