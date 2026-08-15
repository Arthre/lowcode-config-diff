# 命名规范：语义化拟人化命名

> **适用范围**：所有新写的变量名、函数名、方法名。 **已有代码**不强制改名，但在修改到相关代码时建议顺手改进。

## 核心原则

**让代码读起来像在描述"谁在做什么"，而不是"对数据执行了什么操作"。**

**简洁代码风格优先。** 新增代码应先匹配当前文件、当前模块的既有写法，用最少的必要结构表达需求；不要因为外部示例或猜测的扩展性，引入额外常量、配置对象、包装函数或特殊协议。只有当后端明确要求、项目已有同类先例，或复用需求真实存在时，才增加抽象和特殊处理。

## 避免的命名模式

以下前缀属于"机械化命名"，它们太泛化，不传达具体业务意图：

| 避免                          | 问题                                                                    |
| ----------------------------- | ----------------------------------------------------------------------- |
| `resolve...`                  | 太模糊，"解析"了什么？                                                  |
| `build...`                    | 太模糊，"构建"了什么？                                                  |
| `bind...`                     | 太模糊，"绑定"了什么到什么？                                            |
| `handle...`                   | 太模糊，"处理"了什么？                                                  |
| `process...`                  | 最模糊的，等于没说                                                      |
| `normalize...`                | 太模糊，"正常化"了什么？用 `clean`/`sanitize`/`prepare`/`ensure` 更具体 |
| `get...`                      | 如果只是属性访问可用，但做了计算时应换更具体的名                        |
| `Response...` / `...Response` | 暴露技术实现细节且冗长，无法表达业务语义                                |

## 命名长度要求（简洁优先）

- 命名应简洁，避免重复语义和无效后缀（如 `DataInfo`, `ResultData`）
- 在语义清楚前提下优先短名（如 `listData` 优于 `listResponseData`）
- 连续超过 3 个语义片段时，优先拆分变量或重命名

示例：

```typescript
// ❌ 冗长且技术导向
const listResponse = await fetchList()
const nextListResponse = await fetchList(params)

// ✅ 简洁且语义清晰
const listData = await fetchList()
const nextList = await fetchList(params)
```

## 推荐的命名模式

### 动作类函数

| 场景             | 推荐模式                                  | 示例                                                 |
| ---------------- | ----------------------------------------- | ---------------------------------------------------- |
| 从 A 提取/得到 B | `...From(a)`                              | `pathCountFrom(tree)`                                |
| 将 A 转为 B      | `...To...` / `as...`                      | `snapshotToDiff(s)` / `asConfigTree(raw)`            |
| 打包/序列化      | `pack...` / `serialize...`                | `packCompareSnapshot()`                              |
| 解包/反序列化    | `unpack...` / `parse...`                  | `unpackSavedDiff(json)`                              |
| 应用/写入        | `apply...`                                | `applyCompareOptions(options)`                       |
| 确保/保障        | `ensure...`                               | `ensureConfigKey(item)`                              |
| 拾取/筛选        | `pick...` / `filter...`                   | `pickChangedPaths(list)`                             |
| 合并/融合        | `merge...` / `blend...`                   | `mergeConfigPatch(base, override)`                   |
| 通知/发射        | `notify...` / `emit...`                   | `notifyDiffChanged()`                                |
| 克隆/复制        | `clone...` / `copy...`                    | `cloneConfigTree(tree)`                              |
| 校验/守卫        | `validate...` / `guard...`                | `validateConfigPath(path)`                           |
| 清洗/预处理      | `clean...` / `sanitize...` / `prepare...` | `cleanConfigPath(raw)` / `prepareConfigPaths(paths)` |

### 获取类函数/计算属性

| 场景        | 推荐模式                      | 示例                                       |
| ----------- | ----------------------------- | ------------------------------------------ |
| 当前/活跃的 | `current...` / `active...`    | `currentDiff` / `activePath`               |
| 从属性派生  | `...Of(x)` / `...By(x)`       | `labelOf(item)` / `nodeByPath(path)`       |
| 判断类      | `is...` / `has...` / `can...` | `isJsonMode` / `hasChanges` / `canCompare` |
| 应该/需要   | `should...` / `needs...`      | `shouldIgnoreOrder` / `needsRefresh`       |

### 事件回调

| 场景     | 推荐模式             | 示例                                    |
| -------- | -------------------- | --------------------------------------- |
| 事件响应 | `on...`              | `onDiffChanged()`                       |
| 用户动作 | `when...` / 直接动词 | `whenUserConfirms()` / `clearCompare()` |

## 对比示例

```typescript
// ❌ 机械化
function resolveDiffResult(value: unknown): DiffResult { ... }
function buildComparePayload(params: any): Payload { ... }
function handleConfigChange(key: string): void { ... }
function processConfigList(configs: ConfigItem[]): ConfigItem[] { ... }
function normalizeConfigPaths(paths: string[]): void { ... }
function getDefaultDiffMode(mode: DiffMode): string { ... }

// ✅ 语义化拟人化
function diffResultFrom(raw: unknown): DiffResult { ... }
function packCompareSnapshot(params: CompareSnapshotOptions): Payload { ... }
function onConfigChanged(key: string): void { ... }
function cleanConfigList(configs: ConfigItem[]): ConfigItem[] { ... }
function prepareConfigPaths(paths: string[]): void { ... }
function diffModeLabelFor(mode: DiffMode): string { ... }
```

## 函数参数风格：对象参数优先

**当函数参数超过 3 个时，必须使用对象参数（Options 模式）。**

位置参数在参数较多时容易搞错顺序，且扩展时必须修改所有调用点。对象参数天然避免这些问题。

### 规则

| 参数数量 | 要求                               |
| -------- | ---------------------------------- |
| ≤ 2 个   | 位置参数即可                       |
| 3 个     | 建议使用对象参数，视语义清晰度决定 |
| ≥ 4 个   | **必须**使用对象参数               |

### 示例

```typescript
// ❌ 位置参数 — 超过 3 个，容易搞错顺序
function createDiffSession(
  leftId: string,
  rightId: string,
  mode: DiffMode,
  ignoreOrder: boolean,
  includeMeta: boolean,
  label: string,
) { ... }

// 调用时看不出每个参数是什么
createDiffSession('a', 'b', 'json', true, false, '对比');

// ✅ 对象参数 — 清晰、安全、易扩展
interface CreateDiffSessionOptions {
  leftId: string
  rightId: string
  mode: DiffMode
  ignoreOrder?: boolean
  includeMeta?: boolean
  label?: string
}

function createDiffSession(options: CreateDiffSessionOptions) { ... }

// 调用时每个字段含义一目了然
createDiffSession({ leftId: 'a', rightId: 'b', mode: 'json', label: '对比' })
```

### 对象参数命名约定

- 接口名：`{函数名}Options`（如 `CreateDiffSessionOptions`、`CompareOptions`）
- 必填字段放前面，可选字段放后面并给默认值
- 解构时在函数内部统一赋默认值

## 函数注释规范：JSDoc 优先

新增或重写函数注释时使用简洁 JSDoc：**用简体中文**写一句话描述用途，必要时补 `@param` 与 `@returns`（参数说明亦用中文）。注释只说明业务含义，不展开实现细节、历史背景或调用链路。

本项目用户与协作者为中文用户，**不要**用英文写注释或用户可见提示。

```typescript
/**
 * 计算两个数的和。
 * @param num1 - 第一个加数
 * @param num2 - 第二个加数
 * @returns 两数之和
 */
function sum(num1: number, num2: number): number {
  return num1 + num2
}
```

对象参数可拆分描述字段：

```typescript
/**
 * 将左右两侧配置写入当前对比会话。
 * @param params - 应用参数
 * @param params.left - 左侧配置
 * @param params.right - 右侧配置
 * @param params.shouldRefresh - 应用后是否刷新 Diff 视图
 * @returns 应用完成后结束
 */
async function applyComparePayloads({
  left,
  right,
  shouldRefresh,
}: {
  left: unknown
  right: unknown
  shouldRefresh: boolean
}) {
  // ...
}
```

规则：

- 注释与 `@param` / `@returns` 说明使用**简体中文**；勿写英文套话。
- 函数说明第一句回答“这个函数做什么”，保持简短。
- `@param` 说明参数业务意义，避免重复 TypeScript 类型或写长段背景。
- 仅当返回值有业务含义或对外 API 需要说明时写 `@returns`；普通 `void` 可省略。
- 对外导出函数、hook 返回的关键函数、复杂 helper 必须写完整 JSDoc；非常短且语义自明的局部回调可不写。

## 类型判断风格：减少重复判断

在保证类型安全的前提下，减少重复的 `typeof` 与 `Array.isArray` 判断，让逻辑更聚焦业务语义。

### 规则

- 同一变量在同一作用域内，避免重复写多次 `typeof value === '...'` 或 `Array.isArray(value)`。
- 优先复用通用守卫函数（如 `isString`、`isArray`、`isObject`），避免散落的原始判断表达式。
- 判断逻辑出现 2 次及以上时，优先提炼成语义化函数（如 `isValidRouteParam`、`listFrom`）。
- 优先“早返回（guard clause）”，减少嵌套层级和反复判断。
- 仅在没有可复用守卫函数时，直接使用 `typeof` / `Array.isArray`，并尽量集中在单点。
- 修改已有文件时，如果在相关改动范围内发现旧代码残留 `Array.isArray`、散落 `typeof`、`x === a || x === b` 等低级判断，应在同一轮中一并清理；不要只保证新增代码符合规范而保留同文件旧噪音。
- 多处业务判断表达同一语义时，优先提炼为 `is...` / `has...` / `can...` 语义函数，例如 `isJsonDiffMode()`、`isSuccessResult()`、`hasItems()`。

### 示例

```typescript
// ❌ 重复判断，噪音较多
if (typeof value === 'string' && value.trim()) {
  // ...
}
if (typeof value === 'string') {
  // ...
}
if (Array.isArray(list) && list.length > 0) {
  // ...
}

// ✅ 单点判断 + 语义化守卫
function nonEmptyTextFrom(value: unknown) {
  if (!isString(value)) return ''
  const trimmed = value.trim()
  return trimmed ? trimmed : ''
}

function hasItems(list: unknown) {
  return isArray(list) && list.length > 0
}
```

## 布尔判断风格：直接表达意图

对已经是布尔语义的字段或开关，优先直接判断变量本身，避免写成 `xxx === true` 这类机械化比较。

### 规则

- 条件分支中直接写 `if (config.enabled)` / `if (!config.enabled)`。
- 对需要写入标准布尔值的归一化字段，使用 `Boolean(value)`，不要使用 `value === true`。
- 只有在业务上必须区分“严格等于 true”和其它 truthy 值时，才允许使用 `=== true`，并在局部注释说明原因。

### 示例

```typescript
// ❌ 机械化比较
if (options.ignoreOrder === true) {
  compareFlags.ignoreOrder = true
}

const nextOptions = {
  ignoreOrder: options.ignoreOrder === true,
}

// ✅ 直接表达布尔语义
if (options.ignoreOrder) {
  compareFlags.ignoreOrder = true
}

const nextOptions = {
  ignoreOrder: Boolean(options.ignoreOrder),
}
```

## 多字符串判断风格：使用 includes

当同一个变量需要匹配多个字符串候选值时，优先使用数组 `.includes()` 表达集合判断，避免写成长串 `||` 比较。

### 规则

- 多个字符串候选：使用 `['a', 'b'].includes(value)`。
- 候选集合有业务含义或复用需求时，提取为语义化常量，如 `downloadButtonTypes.includes(type)`。
- 只有 1 个候选值时，保留直接相等判断即可。
- 不要写 `value === 'a' || value === 'b'` 这类重复比较。

### 示例

```typescript
// ❌ 重复比较
if (mode === 'json' || mode === 'yaml') {
  applyTextDiff()
}

// ✅ 集合判断
if (['json', 'yaml'].includes(mode)) {
  applyTextDiff()
}

// ✅ 有业务语义时提取常量
const textDiffModes = ['json', 'yaml']

if (textDiffModes.includes(mode)) {
  applyTextDiff()
}
```

## 工具复用风格：优先项目工具层

在命名和判断风格之外，通用能力优先复用已有库与 `src/utils/`，避免在业务代码中重复实现同类工具。

### 规则

- 新增工具逻辑前，先检查 VueUse（`@vueuse/core`）、`src/utils/`、现有 composables，以及已声明依赖是否已有对应能力。
- 对“通用问题”优先用库函数，对“业务语义”再封装薄层函数名（如 `pathsFromRoute`）。
- 避免在多个文件重复出现同类实现（例如重复的对象安全访问、数组筛选、字符串判空）。
- 当本地工具被 2 个及以上模块复用时，评估提取到 `src/utils/`。
- 复用优先级：VueUse / 已装第三方能力 > `src/utils/` > 当前文件私有函数。

### 示例

```typescript
// ❌ 重复造轮子
function hasText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

// ✅ 优先复用 + 语义化薄封装
function hasText(value: unknown) {
  if (!isString(value)) return false
  return value.trim().length > 0
}
```

## 判断标准

给函数取名后，问自己：

1. 光看名字能知道它做了什么吗？
2. 如果另一个开发者第一次看到这个名字，能猜到它的作用吗？
3. 名字是否传达了**业务意图**而不仅仅是**技术操作**？

如果有一个"否"，换个名字。
