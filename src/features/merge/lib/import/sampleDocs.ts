export const SAMPLE_REFERENCE_FILE_NAME = '示例-参考.json'
export const SAMPLE_TARGET_FILE_NAME = '示例-目标.json'

export const SAMPLE_REFERENCE_JSON = `{
  "title": "列表页",
  "pageSize": 10,
  "showExport": true,
  "tableGrid": [{ "prop": "name", "label": "名称" }]
}`

export const SAMPLE_TARGET_JSON = `{
  "title": "列表页",
  "pageSize": 20,
  "tableGrid": [
    { "prop": "name", "label": "姓名" },
    { "prop": "status", "label": "状态" }
  ]
}`

export function isSampleFillAvailable(leftDoc: string, rightDoc: string): boolean {
  return leftDoc.length === 0 && rightDoc.length === 0
}
