# Diff / Result JSON 代码块与布局优化

**日期：** 2026-08-17  
**状态：** 已完成  
**依赖：** [M5](./2026-08-15-m5-ui-diff-tree.md)、[M6](./2026-08-15-m6-ui-merge-export.md)  
**关联计划：**

- [`.docs/plans/archive/2026-08-17-diff-result-json-viewer.md`](../plans/archive/2026-08-17-diff-result-json-viewer.md)（CM Viewer / Merge / 压缩格式化）
- [`.docs/plans/archive/2026-08-17-side-radio-result-annotate.md`](../plans/archive/2026-08-17-side-radio-result-annotate.md)（radio 选边、两列空态、合并来源高亮）

**影响模块：** `JsonCodeViewer`、`JsonMergeViewer`、`DiffLeafViewer`、`DiffTree`、`MergePreview`、`mergeAnnotations`、`format`、`codemirrorTheme`

---

## 背景与目标

差异叶曾用双侧独立 `<details>` + `<pre>`，导致大数据卡顿、无行号/冲突高亮、折叠不同步。结果区曾为 `<pre>`，缺行号与压缩/格式化。后续又发现分段选边像 tab 且卡顿、单侧缺失时非两列、结果区看不出选边来源。

**最终目标（当前实现）：**

- 统一 CodeMirror 6 只读展示（行号 + JSON 高亮）
- modified：`@codemirror/merge` 两列行级差异（无 `collapseUnchanged`）
- 叶级共享「展开对比」才挂载编辑器；**不按视口**销毁重建
- 选边用 **radio**；树结构与 `side` 解耦，避免选边整树重算
- 单侧缺失仍保持两列，空侧提示「无此配置」
- Result：格式化/压缩、合并来源列表、格式化预览按侧别高亮 keep 片段

---

## 需求变更

### + 新增

- [只读 JSON Viewer]：CM6，行号、折叠 gutter、JSON lang、CSS 变量主题；可选 `sideMarks`
- [Merge 对比]：modified 且双侧有值 → `MergeView`（TEST | PROD）行级高亮；强制横向两列 CSS
- [两列空态]：added / removed 等 → 始终两列；缺失侧虚线空槽 +「TEST/PROD 无此配置」
- [共享展开]：叶级「展开对比」；折叠仅摘要；展开才挂载
- [懒挂载]：仅随展开挂载；**不**按 IntersectionObserver 销毁
- [选边]：原生 radio（TEST / PROD）；结构指纹不含 side
- [Result 压缩格式化]：`formatConfig` / `compressConfig`；复制/下载用当前视图
- [合并来源]：`buildMergeAnnotations`（keep/drop）；列表 + 格式化预览侧别着色

### ~ 修改

- Diff 叶去掉两侧独立 `<details>`
- 选边由分段按钮改为 radio（避免 tab 感与多余重渲染）
- 容器「整支用 TEST/PROD」为次要按钮
- 去掉视口外销毁编辑器；去掉 Merge `collapseUnchanged`

### 非目标

- 不引入 Monaco；不改 `diffConfig` 数组整段语义
- 不做字符级 inline diff；不持久化展开态/压缩偏好
- 不做树级虚拟列表（本切片）

---

## 接口与规则

- 依赖：`codemirror` / `vue-codemirror`、`@codemirror/merge`、`@codemirror/search` 及 CM 对等包
- Core：`compressConfig(config) => JSON.stringify(config)`；`formatConfig` 缩进 2
- UI：`mergeAnnotations` 的 drop 规则与 `mergeConfig` 的 delete 叶对齐
- 选边只走 `diffSession`；展示层不改 merge 语义
- 编辑器：未聚焦时不抢父级滚轮；`Mod-f` / `Mod-h` 打开查找（可编辑含替换）；面板中文文案

---

## 验收清单

1. 差异叶复杂值默认展开对比；可收起；展开后有行号；modified 两列冲突高亮；无两侧独立折叠、无 unchanged 折叠块
2. 仅展开项挂载编辑器；滚动列表不因视口反复重建
3. radio 选边流畅；改 side 不重建整树
4. 单侧缺失时仍两列，空侧有中文提示
5. Result：行号；格式化/压缩；合并来源列表；格式化模式下 keep 片段侧别高亮；复制下载与当前视图一致
6. 单测（含 `mergeAnnotations.test.ts`）与 lint/build 通过；`.docs/ui/README.md` 已同步
