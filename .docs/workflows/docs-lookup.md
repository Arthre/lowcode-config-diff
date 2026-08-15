# 文档查询协议

> **触发时机**：需要查询任何库、框架、SDK、API、CLI 工具或云服务的最新文档时。即使是你熟悉的库（Vue、Vite、UnoCSS 等），也应查询最新文档，训练数据可能不反映最近的变更。

## 核心原则

**用最新的官方文档，不要依赖记忆。**

## 何时使用

- API 语法、配置方式
- 版本迁移指南
- 库特定的调试方法
- 安装/配置说明
- CLI 工具用法

## 何时不使用

- 纯重构（不涉及外部 API）
- 从零写脚本（不涉及外部库）
- 调试业务逻辑
- 代码审查
- 通用编程概念

## 查询方式（按平台）

### Cursor（有 Context7 MCP）

```
1. 调用 resolve-library-id 获取库 ID
2. 调用 query-docs 查询具体问题
```

### Claude Code / Codex（有 MCP 支持）

如果配置了 Context7 MCP Server，流程同上。

### 无 MCP 支持的平台

使用 Web 搜索查询官方文档：

- 搜索时包含当前年份
- 优先访问官方文档网站
- 注意 API 版本

## 本项目常用技术栈

版本以根目录 `package.json` 为准（下表为当前声明版本，升级依赖后请同步本表）。

| 技术            | 当前版本  | 文档地址                                |
| --------------- | --------- | --------------------------------------- |
| Vue             | `^3.5.40` | https://vuejs.org/                      |
| TypeScript      | `~6.0.2`  | https://www.typescriptlang.org/         |
| Vite            | `^8.2.0`  | https://vitejs.dev/                     |
| Vue Router      | `^5.2.0`  | https://router.vuejs.org/               |
| Pinia           | `^4.0.3`  | https://pinia.vuejs.org/                |
| Axios           | `^1.19.0` | https://axios-http.com/                 |
| VueUse          | `^14.4.0` | https://vueuse.org/                     |
| UnoCSS          | `^66.7.5` | https://unocss.dev/                     |
| NProgress       | `^0.2.0`  | https://github.com/rstacruz/nprogress   |
| Vitest          | `^4.1.10` | https://vitest.dev/                     |
| @vue/test-utils | `^2.4.11` | https://test-utils.vuejs.org/           |
| ESLint          | `^10.8.1` | https://eslint.org/                     |
| Prettier        | `^3.9.6`  | https://prettier.io/                    |
| vue-tsc         | `^3.3.8`  | https://github.com/vuejs/language-tools |

> 此列表需随项目技术栈变化同步更新。
