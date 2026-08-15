# M6 UI Merge Preview & Export 实施计划

> **给 Agent 执行者：** 必须使用 [子代理驱动开发](../../workflows/subagent-driven-development.md)（推荐）或 [执行计划](../../workflows/executing-plans.md) 逐步实施。步骤使用 checkbox（`- [ ]`）语法跟踪。

**日期：** 2026-08-15  
**状态：** 已完成  
**关联设计：** [总览](../../specs/2026-08-15-v0.1-config-diff-merge.md)、[M6](../../specs/2026-08-15-m6-ui-merge-export.md)  
**目标：** 按 diffSession 选边实时 `mergeConfig` 预览，并支持复制/下载 `config.json`，闭环 V0.1。  
**架构：** 纯工具 `exportConfig`（摘要/复制/下载）；`MergePreview` 读 Pinia session 计算合并结果；HomeView Result 区接入。不改 Core merge 语义。  
**技术栈：** Vue 3、Pinia、UnoCSS、Vitest；`mergeConfig` / `formatConfig`

## Global Constraints

- 不改 `src/core/merge.ts` 语义；不引入后端 / 持久化。
- 下载文件名固定 `config.json`；内容为 `formatConfig(result)`，无 metadata。
- 无 session 时不调用 merge；不写 localStorage。
- 文件收拢：见结构；单测中文。
- 未经用户明确要求不 commit。

## 潜在影响清单（已确认执行）

| 影响面                    | 说明                 |
| ------------------------- | -------------------- |
| 新建 utils + MergePreview | 见下                 |
| HomeView Result           | 替换占位             |
| diffSession               | 只读消费，可不改 API |

---

## 文件结构

```text
src/utils/exportConfig.ts
src/utils/exportConfig.test.ts
src/components/MergePreview.vue
src/views/HomeView.vue
```

---

### 任务 1：exportConfig 工具 + 摘要单测

**接口：**

```ts
export function summarizeMergeSides(leaves: DiffItem[]): {
  total: number
  testCount: number
  prodCount: number
}

export function buildMergeSummaryText(leaves: DiffItem[]): string
// 例：`共 3 项差异，其中 1 项取 PROD`；total===0 时 `无差异，结果与 TEST 一致`（或等价清晰文案）

export async function copyText(text: string): Promise<void>
// navigator.clipboard.writeText；失败则抛错或返回，由 UI 提示

export function downloadJsonFile(content: string, filename = 'config.json'): void
// Blob + 临时 <a download>；不写盘到用户指定路径以外的浏览器下载
```

- [x] **步骤 1：写失败测试** `src/utils/exportConfig.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import type { DiffItem } from '@/core/types'
import { buildMergeSummaryText, summarizeMergeSides } from './exportConfig'

function leaf(partial: Partial<DiffItem> & Pick<DiffItem, 'id' | 'type' | 'side'>): DiffItem {
  return { path: [partial.id], ...partial }
}

describe('summarizeMergeSides', () => {
  it('统计 test/prod 数量', () => {
    const leaves = [
      leaf({ id: 'a', type: 'modified', side: 'test' }),
      leaf({ id: 'b', type: 'added', side: 'test' }),
      leaf({ id: 'c', type: 'removed', side: 'prod' }),
    ]
    expect(summarizeMergeSides(leaves)).toEqual({ total: 3, testCount: 2, prodCount: 1 })
  })
})

describe('buildMergeSummaryText', () => {
  it('无差异时说明与 TEST 一致', () => {
    expect(buildMergeSummaryText([])).toMatch(/无差异/)
  })

  it('有差异时包含总数与取 PROD 数', () => {
    const text = buildMergeSummaryText([
      leaf({ id: 'a', type: 'modified', side: 'test' }),
      leaf({ id: 'c', type: 'removed', side: 'prod' }),
    ])
    expect(text).toContain('2')
    expect(text).toMatch(/PROD/)
  })
})
```

- [x] **步骤 2：RED** `pnpm test:run src/utils/exportConfig.test.ts`

- [x] **步骤 3：实现** `exportConfig.ts`（含 copyText / downloadJsonFile；后两者可不单测 DOM，但必须实现）

- [x] **步骤 4：GREEN**

- [ ] **步骤 5：提交**（仅用户要求时）

---

### 任务 2：MergePreview + HomeView

**MergePreview.vue：**

- 读 `useDiffSession()`；`!active` → 占位文案
- `merged = computed(() => mergeConfig(test, prod, leaves))`（active 且 configs 非空）
- `previewText = formatConfig(merged)`
- 展示摘要 `buildMergeSummaryText(leaves)`
- 按钮：复制、下载；复制成功可短暂「已复制」
- 预览：`<pre class="...">` 即可（勿为折叠再引重依赖）；高度限制 + overflow auto
- 选边变化时因 leaves 响应式自动更新

**HomeView：** Result 区改为 `<MergePreview />`

- [x] **步骤 1：实现组件并接线**

- [x] **步骤 2：验证**

```bash
pnpm test:run
pnpm lint
pnpm build
```

- [ ] **步骤 3：提交**（仅用户要求时）

---

### 任务 3：文档收尾

- M6 规格 / 总览 → 已完成（V0.1 主路径闭环）
- `.docs/ui/README.md` 补 MergePreview / exportConfig；尚未实现清空或写「V0.1 完成」
- 计划归档

- [x] **步骤 1：验证 + 回写 + 归档**
- [ ] **步骤 2：提交**（仅用户要求时）

---

## Spec 覆盖自检

| Spec                    | 任务                       |
| ----------------------- | -------------------------- |
| 实时 merge 预览         | 2                          |
| 复制 / 下载 config.json | 1–2                        |
| 摘要                    | 1–2                        |
| 无持久化 / 无后端       | 全任务                     |
| 三套语义                | mergeConfig + session 选边 |

---

## 完成后

V0.1 Diff/Merge 主路径已闭环；可做收尾审查或发布准备。
