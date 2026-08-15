# M4：UI JSON Input

**日期：** 2026-08-15  
**状态：** 草案  
**依赖：** [总览](./2026-08-15-v0.1-config-diff-merge.md)、[M1](./2026-08-15-m1-core-parse.md)  
**关联计划：** （建议 Core M1 完成后；可与 M2 计划并行准备）  
**影响模块：** `src/views/*`、`src/components/*`（Json 输入区）

---

## 背景与目标

提供 TEST / PROD 双栏输入与校验，作为后续 Diff 的入口。本切片不要求完成 Diff 树与 Merge 预览。

---

## 需求变更

### + 新增

- [双栏输入]：TEST JSON、PROD JSON 左右布局。
- [导入方式]：文件导入、文本粘贴/编辑、格式化、清空。
- [校验展示]：Valid / Invalid；Invalid 显示错误信息（及行/列，若可提供）。
- [门禁]：两侧均合法才允许触发「开始 Diff」（按钮可先只调用 parse 或预留回调）。

### 非目标（本切片）

- Diff 树、勾选、Merge 预览、复制下载成品
- 本地持久化用户 JSON
- 引入大型 JSON 编辑器（优先 textarea + 校验）

---

## 接口与规则

- 解析调用 M1 `parseConfig` / `formatConfig`。
- 单页结构中本切片只交付 **JSON Input Area**（可保留空的 Diff/Result 占位）。
- 不上传 JSON；刷新后不恢复敏感内容。

**建议：** `src/components/JsonEditor`（或等价）、主视图嵌入双栏。

---

## 验收清单

1. 可粘贴 / 编辑 TEST、PROD 文本。
2. 可从文件导入。
3. 可格式化、可清空。
4. 非法 JSON 显示 Invalid 与错误信息。
5. 顶层须为 object 或 array；`null` / primitive 视为非法。
6. 仅当两侧 Valid 时可点击「开始 Diff」。
7. 手工走通上述路径。

---

## 测试要点

以手工验收为主；若有纯函数包装校验逻辑，可补少量单测。
