export type JsonPathSeg = { type: 'key'; key: string } | { type: 'index'; index: number }

type ObjectKeyHit = { keyStart: number; valueStart: number }

/** 在 JSON 源文本中定位 path 对应节点。对象段返回属性名起始引号偏移；数组段返回该元素起始偏移。失败返回 null。空 path 返回 0。 */
export function jsonPathOffset(source: string, path: readonly JsonPathSeg[]): number | null {
  if (path.length === 0) return 0

  let pos = skipWs(source, 0)
  if (pos >= source.length) return null

  for (let i = 0; i < path.length; i++) {
    const seg = path[i]
    if (seg === undefined) return null
    const isLast = i === path.length - 1

    if (seg.type === 'key') {
      const hit = findObjectKey(source, pos, seg.key)
      if (hit === null) return null
      if (isLast) return hit.keyStart
      pos = hit.valueStart
      continue
    }

    const elementStart = findArrayElement(source, pos, seg.index)
    if (elementStart === null) return null
    if (isLast) return elementStart
    pos = elementStart
  }

  return null
}

function findObjectKey(source: string, from: number, key: string): ObjectKeyHit | null {
  let pos = skipWs(source, from)
  if (charAt(source, pos) !== '{') return null
  pos = skipWs(source, pos + 1)
  if (charAt(source, pos) === '}') return null

  while (pos < source.length) {
    pos = skipWs(source, pos)
    if (charAt(source, pos) !== '"') return null
    const keyStart = pos
    const parsed = readString(source, pos)
    if (parsed === null) return null
    pos = skipWs(source, parsed.end)
    if (charAt(source, pos) !== ':') return null
    pos = skipWs(source, pos + 1)
    if (parsed.value === key) return { keyStart, valueStart: pos }

    const afterValue = skipValueAt(source, pos)
    if (afterValue === null) return null
    pos = skipWs(source, afterValue)
    if (charAt(source, pos) === '}') return null
    if (charAt(source, pos) !== ',') return null
    pos += 1
  }

  return null
}

function findArrayElement(source: string, from: number, index: number): number | null {
  if (!Number.isInteger(index) || index < 0) return null
  let pos = skipWs(source, from)
  if (charAt(source, pos) !== '[') return null
  pos = skipWs(source, pos + 1)
  if (charAt(source, pos) === ']') return null

  let current = 0
  while (pos < source.length) {
    pos = skipWs(source, pos)
    if (current === index) return pos
    const afterValue = skipValueAt(source, pos)
    if (afterValue === null) return null
    pos = skipWs(source, afterValue)
    current += 1
    if (charAt(source, pos) === ']') return null
    if (charAt(source, pos) !== ',') return null
    pos += 1
  }

  return null
}

function skipValueAt(source: string, from: number): number | null {
  const pos = skipWs(source, from)
  const ch = charAt(source, pos)
  if (ch === '"') {
    const parsed = readString(source, pos)
    return parsed === null ? null : parsed.end
  }
  if (ch === '{') return skipObject(source, pos)
  if (ch === '[') return skipArray(source, pos)
  if (ch === 't') return expectLiteral(source, pos, 'true')
  if (ch === 'f') return expectLiteral(source, pos, 'false')
  if (ch === 'n') return expectLiteral(source, pos, 'null')
  if (ch === '-' || isDigit(ch)) return skipNumber(source, pos)
  return null
}

function skipObject(source: string, from: number): number | null {
  if (charAt(source, from) !== '{') return null
  let pos = skipWs(source, from + 1)
  if (charAt(source, pos) === '}') return pos + 1

  while (pos < source.length) {
    pos = skipWs(source, pos)
    if (charAt(source, pos) !== '"') return null
    const key = readString(source, pos)
    if (key === null) return null
    pos = skipWs(source, key.end)
    if (charAt(source, pos) !== ':') return null
    const afterValue = skipValueAt(source, pos + 1)
    if (afterValue === null) return null
    pos = skipWs(source, afterValue)
    if (charAt(source, pos) === '}') return pos + 1
    if (charAt(source, pos) !== ',') return null
    pos += 1
  }

  return null
}

function skipArray(source: string, from: number): number | null {
  if (charAt(source, from) !== '[') return null
  let pos = skipWs(source, from + 1)
  if (charAt(source, pos) === ']') return pos + 1

  while (pos < source.length) {
    const afterValue = skipValueAt(source, pos)
    if (afterValue === null) return null
    pos = skipWs(source, afterValue)
    if (charAt(source, pos) === ']') return pos + 1
    if (charAt(source, pos) !== ',') return null
    pos += 1
  }

  return null
}

function readString(source: string, from: number): { value: string; end: number } | null {
  if (charAt(source, from) !== '"') return null
  let pos = from + 1
  let value = ''

  while (pos < source.length) {
    const ch = charAt(source, pos)
    if (ch === undefined) return null
    if (ch === '"') return { value, end: pos + 1 }
    if (ch === '\\') {
      const next = charAt(source, pos + 1)
      if (next === undefined) return null
      if (next === 'u') {
        const hex = source.slice(pos + 2, pos + 6)
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) return null
        value += String.fromCharCode(Number.parseInt(hex, 16))
        pos += 6
        continue
      }
      const escaped = unescapeJsonChar(next)
      if (escaped === null) return null
      value += escaped
      pos += 2
      continue
    }
    if (ch.charCodeAt(0) < 0x20) return null
    value += ch
    pos += 1
  }

  return null
}

function unescapeJsonChar(ch: string): string | null {
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
      return null
  }
}

function skipNumber(source: string, from: number): number | null {
  let pos = from
  if (charAt(source, pos) === '-') pos += 1

  const first = charAt(source, pos)
  if (first === '0') {
    pos += 1
  } else if (isDigit(first)) {
    while (isDigit(charAt(source, pos))) pos += 1
  } else {
    return null
  }

  if (charAt(source, pos) === '.') {
    pos += 1
    if (!isDigit(charAt(source, pos))) return null
    while (isDigit(charAt(source, pos))) pos += 1
  }

  const exp = charAt(source, pos)
  if (exp === 'e' || exp === 'E') {
    pos += 1
    const sign = charAt(source, pos)
    if (sign === '+' || sign === '-') pos += 1
    if (!isDigit(charAt(source, pos))) return null
    while (isDigit(charAt(source, pos))) pos += 1
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

function charAt(source: string, pos: number): string | undefined {
  return pos >= 0 && pos < source.length ? source[pos] : undefined
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9'
}
