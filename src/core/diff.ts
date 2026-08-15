import { deepEqual } from './equal'
import type { Config, DiffItem, DiffSide, DiffType, JsonValue } from './types'

function isPlainObject(value: unknown): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function valueTypeOf(value: JsonValue): NonNullable<DiffItem['valueType']> {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return typeof value as 'string' | 'number' | 'boolean'
}

function defaultSide(type: DiffType): DiffSide {
  return type === 'removed' ? 'prod' : 'test'
}

function makeId(path: string[]): string {
  return path.length === 0 ? '(root)' : path.join('.')
}

function pushLeaf(
  out: DiffItem[],
  path: string[],
  type: DiffType,
  testValue: JsonValue | undefined,
  prodValue: JsonValue | undefined,
  options?: { arrayMode?: 'whole' },
): void {
  const displayValue = (type === 'removed' ? prodValue : testValue) as JsonValue
  const item: DiffItem = {
    id: makeId(path),
    path: [...path],
    type,
    side: defaultSide(type),
    valueType: valueTypeOf(displayValue),
  }
  if (testValue !== undefined) item.testValue = testValue
  if (prodValue !== undefined) item.prodValue = prodValue
  if (options?.arrayMode) item.arrayMode = options.arrayMode
  out.push(item)
}

function diffNodes(
  testValue: JsonValue | undefined,
  prodValue: JsonValue | undefined,
  path: string[],
  out: DiffItem[],
): void {
  const testExists = testValue !== undefined
  const prodExists = prodValue !== undefined

  if (!testExists && !prodExists) return

  if (testExists && !prodExists) {
    pushLeaf(out, path, 'added', testValue, undefined, {
      arrayMode: Array.isArray(testValue) ? 'whole' : undefined,
    })
    return
  }

  if (!testExists && prodExists) {
    pushLeaf(out, path, 'removed', undefined, prodValue, {
      arrayMode: Array.isArray(prodValue) ? 'whole' : undefined,
    })
    return
  }

  // both exist
  if (deepEqual(testValue, prodValue)) return

  const testIsArr = Array.isArray(testValue)
  const prodIsArr = Array.isArray(prodValue)
  const testIsObj = isPlainObject(testValue)
  const prodIsObj = isPlainObject(prodValue)

  // 任一侧为 array，或双方类型不可互递归 object → 整段
  if (testIsArr || prodIsArr || !(testIsObj && prodIsObj)) {
    pushLeaf(out, path, 'modified', testValue, prodValue, {
      arrayMode: testIsArr || prodIsArr ? 'whole' : undefined,
    })
    return
  }

  const keys = new Set([...Object.keys(testValue), ...Object.keys(prodValue)])
  for (const key of keys) {
    const hasTest = Object.prototype.hasOwnProperty.call(testValue, key)
    const hasProd = Object.prototype.hasOwnProperty.call(prodValue, key)
    diffNodes(
      hasTest ? testValue[key] : undefined,
      hasProd ? prodValue[key] : undefined,
      [...path, key],
      out,
    )
  }
}

export function diffConfig(testConfig: Config, prodConfig: Config): DiffItem[] {
  const out: DiffItem[] = []
  diffNodes(testConfig as JsonValue, prodConfig as JsonValue, [], out)
  return out
}
