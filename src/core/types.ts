export type JsonPrimitive = string | number | boolean | null

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

/** 配置根：object 或 array */
export type Config = { [key: string]: JsonValue } | JsonValue[]

export class ParseConfigError extends Error {
  readonly line?: number
  readonly column?: number

  constructor(message: string, options?: { line?: number; column?: number }) {
    super(message)
    this.name = 'ParseConfigError'
    this.line = options?.line
    this.column = options?.column
  }
}
