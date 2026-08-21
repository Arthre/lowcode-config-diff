export type JsonPathSeg = { type: 'key'; key: string } | { type: 'index'; index: number }

const CODE_QUOTE = 34
const CODE_BACKSLASH = 92
const CODE_LBRACE = 123
const CODE_RBRACE = 125
const CODE_LBRACKET = 91
const CODE_RBRACKET = 93
const CODE_COLON = 58
const CODE_COMMA = 44
const CODE_MINUS = 45
const CODE_DOT = 46
const CODE_PLUS = 43
const CODE_E = 69
const CODE_e = 101
const CODE_t = 116
const CODE_f = 102
const CODE_n = 110
const CODE_u = 117

type TrieNode = {
  keys: Map<string, TrieNode> | null
  indices: Map<number, TrieNode> | null
  terminals: number[]
}

type WalkState = { remaining: number; abort: boolean }

function emptyNode(): TrieNode {
  return { keys: null, indices: null, terminals: [] }
}

function childForKey(node: TrieNode, key: string): TrieNode {
  if (node.keys === null) node.keys = new Map()
  let child = node.keys.get(key)
  if (child === undefined) {
    child = emptyNode()
    node.keys.set(key, child)
  }
  return child
}

function childForIndex(node: TrieNode, index: number): TrieNode {
  if (node.indices === null) node.indices = new Map()
  let child = node.indices.get(index)
  if (child === undefined) {
    child = emptyNode()
    node.indices.set(index, child)
  }
  return child
}

function hasChildren(node: TrieNode): boolean {
  return (
    (node.keys !== null && node.keys.size > 0) || (node.indices !== null && node.indices.size > 0)
  )
}

function codeAt(source: string, pos: number): number {
  return pos < source.length ? source.charCodeAt(pos) : -1
}

/** 在 JSON 源文本中定位 path 对应节点。对象段返回属性名起始引号偏移；数组段返回该元素起始偏移。失败返回 null。空 path 返回 0。 */
export function jsonPathOffset(source: string, path: readonly JsonPathSeg[]): number | null {
  const [offset] = jsonPathOffsets(source, [path])
  return offset === undefined ? null : offset
}

/** 同一份源文本一次遍历收下全部 path；空 path 为 0。全部命中后停止扫描。 */
export function jsonPathOffsets(
  source: string,
  paths: readonly (readonly JsonPathSeg[])[],
): (number | null)[] {
  const out: (number | null)[] = Array.from({ length: paths.length }, () => null)
  const root = emptyNode()
  let remaining = 0

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]
    if (path === undefined || path.length === 0) {
      out[i] = 0
      continue
    }
    remaining += 1
    let node = root
    for (const seg of path) {
      node = seg.type === 'key' ? childForKey(node, seg.key) : childForIndex(node, seg.index)
    }
    node.terminals.push(i)
  }

  if (remaining === 0) return out

  const state: WalkState = { remaining, abort: false }
  walkValue(source, skipWs(source, 0), root, out, state)
  return out
}

function recordHits(
  node: TrieNode,
  offset: number,
  out: (number | null)[],
  state: WalkState,
): void {
  for (const index of node.terminals) {
    out[index] = offset
    state.remaining -= 1
  }
  if (state.remaining <= 0) state.abort = true
}

function walkValue(
  source: string,
  from: number,
  node: TrieNode,
  out: (number | null)[],
  state: WalkState,
): number | null {
  if (state.abort) return from
  const pos = skipWs(source, from)
  const code = codeAt(source, pos)
  if (code === CODE_LBRACE) return walkObject(source, pos, node, out, state)
  if (code === CODE_LBRACKET) return walkArray(source, pos, node, out, state)
  return skipValueAt(source, pos)
}

function walkObject(
  source: string,
  from: number,
  node: TrieNode,
  out: (number | null)[],
  state: WalkState,
): number | null {
  let pos = skipWs(source, from + 1)
  if (codeAt(source, pos) === CODE_RBRACE) return pos + 1

  while (pos < source.length) {
    if (state.abort) return pos
    pos = skipWs(source, pos)
    if (codeAt(source, pos) !== CODE_QUOTE) return null
    const keyStart = pos
    const parsed = readString(source, pos)
    if (parsed === null) return null
    pos = skipWs(source, parsed.end)
    if (codeAt(source, pos) !== CODE_COLON) return null
    const valueStart = skipWs(source, pos + 1)
    const child = node.keys?.get(parsed.value)
    let after: number | null
    if (child !== undefined) {
      recordHits(child, keyStart, out, state)
      if (state.abort) return valueStart
      after = hasChildren(child)
        ? walkValue(source, valueStart, child, out, state)
        : skipValueAt(source, valueStart)
    } else {
      after = skipValueAt(source, valueStart)
    }
    if (after === null) return null
    pos = skipWs(source, after)
    const next = codeAt(source, pos)
    if (next === CODE_RBRACE) return pos + 1
    if (next !== CODE_COMMA) return null
    pos += 1
  }

  return null
}

function walkArray(
  source: string,
  from: number,
  node: TrieNode,
  out: (number | null)[],
  state: WalkState,
): number | null {
  let pos = skipWs(source, from + 1)
  if (codeAt(source, pos) === CODE_RBRACKET) return pos + 1

  let current = 0
  while (pos < source.length) {
    if (state.abort) return pos
    pos = skipWs(source, pos)
    const elementStart = pos
    const child = node.indices?.get(current)
    let after: number | null
    if (child !== undefined) {
      recordHits(child, elementStart, out, state)
      if (state.abort) return elementStart
      after = hasChildren(child)
        ? walkValue(source, elementStart, child, out, state)
        : skipValueAt(source, elementStart)
    } else {
      after = skipValueAt(source, elementStart)
    }
    if (after === null) return null
    pos = skipWs(source, after)
    current += 1
    const next = codeAt(source, pos)
    if (next === CODE_RBRACKET) return pos + 1
    if (next !== CODE_COMMA) return null
    pos += 1
  }

  return null
}

function skipValueAt(source: string, from: number): number | null {
  const pos = skipWs(source, from)
  const code = codeAt(source, pos)
  if (code === CODE_QUOTE) return skipString(source, pos)
  if (code === CODE_LBRACE) return skipObject(source, pos)
  if (code === CODE_LBRACKET) return skipArray(source, pos)
  if (code === CODE_t) return expectLiteral(source, pos, 'true')
  if (code === CODE_f) return expectLiteral(source, pos, 'false')
  if (code === CODE_n) return expectLiteral(source, pos, 'null')
  if (code === CODE_MINUS || isDigitCode(code)) return skipNumber(source, pos)
  return null
}

function skipObject(source: string, from: number): number | null {
  if (codeAt(source, from) !== CODE_LBRACE) return null
  let pos = skipWs(source, from + 1)
  if (codeAt(source, pos) === CODE_RBRACE) return pos + 1

  while (pos < source.length) {
    pos = skipWs(source, pos)
    const keyEnd = skipString(source, pos)
    if (keyEnd === null) return null
    pos = skipWs(source, keyEnd)
    if (codeAt(source, pos) !== CODE_COLON) return null
    const afterValue = skipValueAt(source, pos + 1)
    if (afterValue === null) return null
    pos = skipWs(source, afterValue)
    if (codeAt(source, pos) === CODE_RBRACE) return pos + 1
    if (codeAt(source, pos) !== CODE_COMMA) return null
    pos += 1
  }

  return null
}

function skipArray(source: string, from: number): number | null {
  if (codeAt(source, from) !== CODE_LBRACKET) return null
  let pos = skipWs(source, from + 1)
  if (codeAt(source, pos) === CODE_RBRACKET) return pos + 1

  while (pos < source.length) {
    const afterValue = skipValueAt(source, pos)
    if (afterValue === null) return null
    pos = skipWs(source, afterValue)
    if (codeAt(source, pos) === CODE_RBRACKET) return pos + 1
    if (codeAt(source, pos) !== CODE_COMMA) return null
    pos += 1
  }

  return null
}

function skipString(source: string, from: number): number | null {
  if (codeAt(source, from) !== CODE_QUOTE) return null
  let pos = from + 1
  const length = source.length
  while (pos < length) {
    const code = source.charCodeAt(pos)
    if (code === CODE_QUOTE) return pos + 1
    if (code === CODE_BACKSLASH) {
      if (pos + 1 >= length) return null
      const next = source.charCodeAt(pos + 1)
      if (next === CODE_u) {
        if (pos + 6 > length || !isHex4(source, pos + 2)) return null
        pos += 6
        continue
      }
      if (!isEscapeChar(next)) return null
      pos += 2
      continue
    }
    if (code < 0x20) return null
    pos += 1
  }
  return null
}

function readString(source: string, from: number): { value: string; end: number } | null {
  const end = skipString(source, from)
  if (end === null) return null
  const inner = source.slice(from + 1, end - 1)
  if (!inner.includes('\\')) return { value: inner, end }
  return { value: unescapeJsonString(inner), end }
}

function unescapeJsonString(inner: string): string {
  let out = ''
  for (let i = 0; i < inner.length; i++) {
    if (inner.charCodeAt(i) !== CODE_BACKSLASH) {
      out += inner[i]
      continue
    }
    const next = inner[i + 1]
    if (next === 'u') {
      out += String.fromCharCode(Number.parseInt(inner.slice(i + 2, i + 6), 16))
      i += 5
      continue
    }
    out += unescapeJsonChar(next ?? '')
    i += 1
  }
  return out
}

function unescapeJsonChar(ch: string): string {
  switch (ch) {
    case '"':
    case '\\':
    case '/':
      return ch
    case 'b':
      return '\b'
    case 'f':
      return '\f'
    case 'n':
      return '\n'
    case 'r':
      return '\r'
    case 't':
      return '\t'
    default:
      return ch
  }
}

function isEscapeChar(code: number): boolean {
  return (
    code === CODE_QUOTE ||
    code === CODE_BACKSLASH ||
    code === 47 ||
    code === 98 ||
    code === 102 ||
    code === CODE_n ||
    code === 114 ||
    code === CODE_t
  )
}

function isHex4(source: string, from: number): boolean {
  for (let i = 0; i < 4; i++) {
    const code = source.charCodeAt(from + i)
    const hex =
      (code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102)
    if (!hex) return false
  }
  return true
}

function skipNumber(source: string, from: number): number | null {
  let pos = from
  if (codeAt(source, pos) === CODE_MINUS) pos += 1

  const first = codeAt(source, pos)
  if (first === 48) {
    pos += 1
  } else if (isDigitCode(first)) {
    while (isDigitCode(codeAt(source, pos))) pos += 1
  } else {
    return null
  }

  if (codeAt(source, pos) === CODE_DOT) {
    pos += 1
    if (!isDigitCode(codeAt(source, pos))) return null
    while (isDigitCode(codeAt(source, pos))) pos += 1
  }

  const exp = codeAt(source, pos)
  if (exp === CODE_e || exp === CODE_E) {
    pos += 1
    const sign = codeAt(source, pos)
    if (sign === CODE_PLUS || sign === CODE_MINUS) pos += 1
    if (!isDigitCode(codeAt(source, pos))) return null
    while (isDigitCode(codeAt(source, pos))) pos += 1
  }

  return pos
}

function expectLiteral(source: string, from: number, literal: string): number | null {
  return source.startsWith(literal, from) ? from + literal.length : null
}

function skipWs(source: string, from: number): number {
  let pos = from
  while (pos < source.length) {
    const code = source.charCodeAt(pos)
    if (code !== 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) break
    pos += 1
  }
  return pos
}

function isDigitCode(code: number): boolean {
  return code >= 48 && code <= 57
}
