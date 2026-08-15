import type { Config, DiffItem, JsonValue } from './types'

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isPlainObject(value: unknown): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDeleteLeaf(leaf: DiffItem): boolean {
  return (
    (leaf.type === 'added' && leaf.side === 'prod') ||
    (leaf.type === 'removed' && leaf.side === 'test')
  )
}

function valueForWrite(leaf: DiffItem): JsonValue {
  if (leaf.type === 'modified') {
    return (leaf.side === 'test' ? leaf.testValue : leaf.prodValue) as JsonValue
  }
  if (leaf.type === 'added') {
    return leaf.testValue as JsonValue
  }
  // removed + prod
  return leaf.prodValue as JsonValue
}

function setAtPath(root: Config, path: string[], value: JsonValue): Config {
  if (path.length === 0) {
    if (Array.isArray(value) || isPlainObject(value)) {
      return deepClone(value as Config)
    }
    throw new Error('根 path 写入值必须是 object 或 array')
  }

  const cloned = deepClone(value)

  let cursor: JsonValue = root as JsonValue
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!
    if (!isPlainObject(cursor) || !Object.prototype.hasOwnProperty.call(cursor, key)) {
      throw new Error(`无法写入 path：中间节点缺失（${path.slice(0, i + 1).join('.')}）`)
    }
    const next = cursor[key]
    if (!isPlainObject(next) && !Array.isArray(next)) {
      throw new Error(`无法写入 path：中间节点不是容器（${path.slice(0, i + 1).join('.')}）`)
    }
    cursor = next
  }

  const last = path[path.length - 1]!
  // V0.1 数组整段比较，叶子 path 不会落到数组下标
  if (!isPlainObject(cursor)) {
    throw new Error(`无法写入 path：父节点无效（${path.join('.')}）`)
  }
  cursor[last] = cloned
  return root
}

function deleteAtPath(root: Config, path: string[]): Config {
  if (path.length === 0) {
    throw new Error('不能删除根 path')
  }

  let cursor: JsonValue = root as JsonValue
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!
    if (!isPlainObject(cursor) || !Object.prototype.hasOwnProperty.call(cursor, key)) {
      throw new Error(`无法删除 path：中间节点缺失（${path.slice(0, i + 1).join('.')}）`)
    }
    const next = cursor[key]
    if (!isPlainObject(next) && !Array.isArray(next)) {
      throw new Error(`无法删除 path：中间节点不是容器（${path.slice(0, i + 1).join('.')}）`)
    }
    cursor = next
  }

  const last = path[path.length - 1]!
  // V0.1 数组整段比较，叶子 path 不会落到数组下标
  if (!isPlainObject(cursor)) {
    throw new Error(`无法删除 path：父节点无效（${path.join('.')}）`)
  }
  delete cursor[last]
  return root
}

export function mergeConfig(testConfig: Config, prodConfig: Config, leaves: DiffItem[]): Config {
  void prodConfig // 值来自 leaf.*Value；保留参数以匹配产品 API
  let result = deepClone(testConfig)

  const writes = leaves.filter((leaf) => !isDeleteLeaf(leaf) && leaf.side === 'prod')
  // side===test 在 TEST 脚手架上为 no-op，跳过即可
  const deletes = leaves.filter((leaf) => isDeleteLeaf(leaf))

  writes.sort((a, b) => a.path.length - b.path.length)
  deletes.sort((a, b) => b.path.length - a.path.length)

  for (const leaf of writes) {
    result = setAtPath(result, leaf.path, valueForWrite(leaf))
  }
  for (const leaf of deletes) {
    result = deleteAtPath(result, leaf.path)
  }

  return result
}
