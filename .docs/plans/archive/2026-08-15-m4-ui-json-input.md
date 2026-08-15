# M4 UI JSON Input 实施计划

> **给 Agent 执行者：** 必须使用 [子代理驱动开发](../workflows/subagent-driven-development.md)（推荐）或 [执行计划](../workflows/executing-plans.md) 逐步实施。步骤使用 checkbox（`- [ ]`）语法跟踪。

**日期：** 2026-08-15  
**状态：** 已完成  
**关联设计：** [`.docs/specs/2026-08-15-v0.1-config-diff-merge.md`](../specs/2026-08-15-v0.1-config-diff-merge.md)、[`.docs/specs/2026-08-15-m4-ui-json-input.md`](../specs/2026-08-15-m4-ui-json-input.md)  
**目标：** 用 CodeMirror 6 交付 TEST/PROD 双栏 JSON 输入、导入/格式化/清空、Valid 校验与「开始 Diff」门禁。  
**架构：** UI 层薄封装 CM6；校验/格式化走 M1 `parseConfig`/`formatConfig`；双栏与工具栏收拢在 `JsonInputArea`；不实现 Diff 树/Merge。  
**技术栈：** Vue 3、TypeScript、Vite、UnoCSS、`codemirror` + `@codemirror/lang-json` + `vue-codemirror`、Vitest

## Global Constraints

- 允许新增 CM6 相关依赖；不引入 Element Plus / Monaco / vanilla-jsoneditor。
- Core（`src/core/*`）禁止依赖 Vue / Pinia / DOM；编辑器仅 UI 层。
- 解析与格式化必须复用 `parseConfig` / `formatConfig`；顶层须为 object 或 array。
- 不上传、不持久化用户 JSON。
- 样式优先 UnoCSS；避免为「好看」大改全局 Vite 模板样式，但主视图需适合双栏全宽布局。
- 单元测试 `describe` / `it` 使用中文；不对 CM6 做脆弱 DOM 单测。
- 未经用户明确要求不创建 git commit。
- **文件收拢：** 不拆过多组件；见下方文件结构。

## 潜在影响清单（已确认执行）

| 影响面                    | 说明                                                         |
| ------------------------- | ------------------------------------------------------------ |
| `package.json`            | 新增 `codemirror`、`@codemirror/lang-json`、`vue-codemirror` |
| 新建 UI 组件 / composable | `JsonEditor`、`JsonInputArea`、`useJsonDocument`             |
| `HomeView`                | 替换占位为输入区 + Diff/Result 空占位                        |
| Core                      | 不改 Diff/Merge API                                          |
| M5+                       | 「开始 Diff」可 emit / 预留回调，本切片可不真正跑 diff       |

---

## 文件结构

```text
src/composables/useJsonDocument.ts
src/composables/useJsonDocument.test.ts
src/components/JsonEditor.vue          # 单栏 CM6（v-model:string）
src/components/JsonInputArea.vue       # 双栏 + 工具栏 + 门禁
src/views/HomeView.vue                 # 嵌入 JsonInputArea
```

不新增第二套 store（本切片状态可放 `JsonInputArea` 内；若需给后续切片用，可用简单 props/emit，YAGNI 不强制 Pinia）。

---

### 任务 1：依赖 + useJsonDocument（可测校验/格式化）

**对应需求：** M4 校验展示、格式化；验收 4–5

**文件：**

- 修改：`package.json` / lockfile（仅通过 `pnpm add`）
- 创建：`src/composables/useJsonDocument.ts`
- 测试：`src/composables/useJsonDocument.test.ts`

**接口：**

- 消费：`parseConfig`、`formatConfig`、`ParseConfigError`（`@/core/*`）
- 产出：
  - `type JsonDocumentStatus = 'empty' | 'valid' | 'invalid'`
  - `interface JsonDocumentState { text: string; status: JsonDocumentStatus; errorMessage?: string; errorLine?: number; errorColumn?: number; config?: Config }`
  - `function evaluateJsonDocument(text: string): JsonDocumentState` — 空串 → `empty`；合法 → `valid`+config；非法 → `invalid`+错误信息
  - `function formatJsonDocument(text: string): { ok: true; text: string } | { ok: false; message: string }` — 先 parse 再 format

- [x] **步骤 1：安装依赖**

```bash
pnpm add codemirror @codemirror/lang-json vue-codemirror
```

- [x] **步骤 2：编写失败测试**

创建 `src/composables/useJsonDocument.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { evaluateJsonDocument, formatJsonDocument } from './useJsonDocument'

describe('evaluateJsonDocument', () => {
  it('空文本为 empty', () => {
    expect(evaluateJsonDocument('').status).toBe('empty')
    expect(evaluateJsonDocument('   ').status).toBe('empty')
  })

  it('合法 object / array 为 valid 并带 config', () => {
    const obj = evaluateJsonDocument('{"a":1}')
    expect(obj.status).toBe('valid')
    expect(obj.config).toEqual({ a: 1 })

    const arr = evaluateJsonDocument('[1]')
    expect(arr.status).toBe('valid')
    expect(arr.config).toEqual([1])
  })

  it('非法 JSON 为 invalid 并带错误信息', () => {
    const result = evaluateJsonDocument('{')
    expect(result.status).toBe('invalid')
    expect(result.errorMessage?.length).toBeGreaterThan(0)
  })

  it('顶层 null / primitive 为 invalid', () => {
    expect(evaluateJsonDocument('null').status).toBe('invalid')
    expect(evaluateJsonDocument('"hi"').status).toBe('invalid')
    expect(evaluateJsonDocument('1').status).toBe('invalid')
  })
})

describe('formatJsonDocument', () => {
  it('合法 JSON 格式化为缩进 2', () => {
    const result = formatJsonDocument('{"a":1}')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.text).toBe('{\n  "a": 1\n}')
    }
  })

  it('非法 JSON 返回 ok false', () => {
    const result = formatJsonDocument('{')
    expect(result.ok).toBe(false)
  })
})
```

- [x] **步骤 3：确认失败** `pnpm test:run src/composables/useJsonDocument.test.ts`；预期 FAIL

- [x] **步骤 4：编写最小实现**

创建 `src/composables/useJsonDocument.ts`：

```ts
import { formatConfig } from '@/core/format'
import { parseConfig, ParseConfigError } from '@/core/parse'
import type { Config } from '@/core/types'

export type JsonDocumentStatus = 'empty' | 'valid' | 'invalid'

export interface JsonDocumentState {
  text: string
  status: JsonDocumentStatus
  errorMessage?: string
  errorLine?: number
  errorColumn?: number
  config?: Config
}

export function evaluateJsonDocument(text: string): JsonDocumentState {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return { text, status: 'empty' }
  }

  try {
    const config = parseConfig(text)
    return { text, status: 'valid', config }
  } catch (error) {
    if (error instanceof ParseConfigError) {
      return {
        text,
        status: 'invalid',
        errorMessage: error.message,
        errorLine: error.line,
        errorColumn: error.column,
      }
    }
    const message = error instanceof Error ? error.message : 'JSON 校验失败'
    return { text, status: 'invalid', errorMessage: message }
  }
}

export function formatJsonDocument(
  text: string,
): { ok: true; text: string } | { ok: false; message: string } {
  try {
    const config = parseConfig(text)
    return { ok: true, text: formatConfig(config) }
  } catch (error) {
    const message =
      error instanceof ParseConfigError
        ? error.message
        : error instanceof Error
          ? error.message
          : '格式化失败'
    return { ok: false, message }
  }
}
```

- [x] **步骤 5：确认通过** `pnpm test:run src/composables/useJsonDocument.test.ts`；预期 PASS

- [ ] **步骤 6：提交**（仅当用户明确要求时）

---

### 任务 2：JsonEditor（CM6）+ JsonInputArea 双栏与门禁

**对应需求：** 双栏、CM6、导入/格式化/清空、Valid 展示、开始 Diff 门禁；验收 1–3、6–7

**文件：**

- 创建：`src/components/JsonEditor.vue`
- 创建：`src/components/JsonInputArea.vue`
- 修改：`src/views/HomeView.vue`
- 视需要微调：`src/style.css`（放宽 `#app` 固定宽度，使双栏可用）

**接口：**

- `JsonEditor`：`modelValue: string` + `update:modelValue`；只读展示无关业务
- `JsonInputArea`：`emit('start-diff', { test: Config; prod: Config })`（两侧 valid 时）
- 消费：`useJsonDocument`、`vue-codemirror`、`json()` from `@codemirror/lang-json`

- [x] **步骤 1：实现 JsonEditor.vue**

```vue
<script setup lang="ts" name="JsonEditor">
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { computed } from 'vue'
import { Codemirror } from 'vue-codemirror'

const props = defineProps<{
  modelValue: string
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const extensions = computed(() => {
  // 浅色主题即可；若引入 oneDark 需额外依赖则不要引入，仅用默认
  return [json()]
})

function onChange(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="flex flex-col gap-2 min-h-0 flex-1">
    <div class="text-sm font-medium text-[var(--text-h)]">{{ label }}</div>
    <Codemirror
      :model-value="modelValue"
      :extensions="extensions"
      :style="{ height: '360px', textAlign: 'left' }"
      class="border border-[var(--border)] rounded overflow-hidden text-left"
      @update:model-value="onChange"
    />
  </div>
</template>
```

**注意：** 不要安装未列在计划中的 theme 包；上面若写了 `oneDark` 请删除该 import，只用 `[json()]`。启用行号：`vue-codemirror` 默认或通过 basicSetup——`vue-codemirror` 的 `autofocus`/`disabled` 按需；推荐：

```ts
import { Codemirror } from 'vue-codemirror'
import { json } from '@codemirror/lang-json'
import { EditorView } from '@codemirror/view'

const extensions = [json(), EditorView.lineWrapping]
```

若 `vue-codemirror` 未带 basicSetup，安装并加入：

```bash
pnpm add @codemirror/basic-setup
```

实际上 `@codemirror/basic-setup` 已弃用，改用：

```ts
import { basicSetup } from 'codemirror'
const extensions = [basicSetup, json()]
```

`codemirror` 包导出 `basicSetup`（含行号）。**以 `basicSetup + json()` 为准。**

- [x] **步骤 2：实现 JsonInputArea.vue**

行为：

- 左右各一 `JsonEditor`（标签 TEST / PROD）
- 每侧按钮：导入（`<input type="file" accept=".json,application/json">`）、格式化、清空
- 每侧状态：`empty` 显示「空」；`valid` 显示 Valid；`invalid` 显示 Invalid + message（有 line/column 则附带）
- 「开始 Diff」：`test.status==='valid' && prod.status==='valid'` 时可点；点击 `emit('start-diff', { test: testState.config!, prod: prodState.config! })`
- 文本用 `ref` + `computed`/watch 调 `evaluateJsonDocument`（可用 `watchDebounced` from VueUse，已依赖 `@vueuse/core`，建议 200ms）

- [x] **步骤 3：改 HomeView.vue**

嵌入 `JsonInputArea`；`@start-diff` 可先 `console` 或本地 `ref` 记录「已可 diff」占位；下方留 Diff / Result 空占位区块（文案即可）。

- [x] **步骤 4：布局**

确保双栏在桌面左右并排、小屏可纵向堆叠（UnoCSS：`grid md:grid-cols-2 gap-4`）。放宽 `src/style.css` 中 `#app { width: 1126px }` 对工具页的限制（例如改为 `width: min(100%, 1400px)` 或 Home 根节点突破居中窄栏）。

- [x] **步骤 5：验证**

```bash
pnpm test:run src/composables/useJsonDocument.test.ts
pnpm test:run src/core
pnpm lint
pnpm build
```

手工：`pnpm dev` — 粘贴、导入、格式化、清空、非法提示、门禁。

- [ ] **步骤 6：提交**（仅当用户明确要求时）

---

### 任务 3：文档收尾

**对应需求：** 活文档同步

**文件：**

- 修改：`.docs/specs/2026-08-15-m4-ui-json-input.md` → 已完成
- 修改：总览切片表 M4 → 已完成
- 创建或修改：`.docs/ui/README.md`（若无 ui 模块文档则创建简短 README：JsonEditor / JsonInputArea / CM6）
- 归档本计划 → `plans/archive/`

- [x] **步骤 1：全量相关测试与 build 再跑一遍**

- [x] **步骤 2：回写规格与活文档并归档 plan**

- [ ] **步骤 3：提交**（仅当用户明确要求时）

---

## Spec 覆盖自检

| Spec 项                                | 任务     |
| -------------------------------------- | -------- |
| 双栏 + CM6                             | 任务 2   |
| 导入 / 格式化 / 清空                   | 任务 2   |
| Valid/Invalid + 行列                   | 任务 1–2 |
| 顶层 object\|array                     | 任务 1   |
| 开始 Diff 门禁                         | 任务 2   |
| 非目标：无 Diff 树/Merge/持久化/Monaco | 全任务   |
| 依赖仅 CM6 相关                        | 任务 1   |

---

## 完成后

归档计划；可推进 M5 Diff 树（消费 `start-diff` 的 Config）。
