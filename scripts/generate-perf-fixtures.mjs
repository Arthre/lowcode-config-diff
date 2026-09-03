/**
 * 生成低代码配置形态的性能测试 JSON 对。
 * 用法：node scripts/generate-perf-fixtures.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'perf')

function fieldItem(index, labelSuffix = '') {
  const name = `field_${String(index).padStart(5, '0')}`
  return {
    fieldName: name,
    field: `col_${index}`,
    id: `id_${index}`,
    label: `字段${index}${labelSuffix}`,
    component: index % 5 === 0 ? 'Select' : 'Input',
    required: index % 7 === 0,
    placeholder: `请输入字段${index}，用于对照大文件差异性能`,
    defaultValue: index % 11 === 0 ? `默认值${index}` : '',
    options:
      index % 5 === 0
        ? [
            { label: '选项A', value: 'a' },
            { label: '选项B', value: 'b' },
            { label: `选项${index}`, value: `v${index}` },
          ]
        : undefined,
    rules: [{ required: index % 7 === 0, message: `字段${index}不能为空` }],
  }
}

function pageConfig(options) {
  const { title, pageSize, fieldCount, extraColumn, mutateItem } = options
  const items = []
  for (let index = 0; index < fieldCount; index += 1) {
    const item = fieldItem(index)
    items.push(mutateItem ? mutateItem(item, index) : item)
  }
  return {
    title,
    pageSize,
    showExport: true,
    pagination: { current: 1, pageSize, total: fieldCount },
    form: { items },
    tableGrid: [
      { prop: 'name', label: '名称' },
      { prop: 'status', label: extraColumn ? '状态' : '状态码' },
      { prop: 'updatedAt', label: '更新时间' },
    ],
    toolbar: [
      { id: 'create', label: '新建' },
      { id: 'export', label: extraColumn ? '导出 Excel' : '导出' },
    ],
  }
}

function sparseMutate(item, index) {
  if (index === 3) return { ...item, label: `${item.label}（改）`, placeholder: '已修改占位' }
  if (index === 12) return { ...item, required: true, defaultValue: '已改默认值' }
  return item
}

function scatteredMutate(item, index) {
  if (index % 20 !== 0) return item
  return { ...item, label: `${item.label}（改）` }
}

function omitField(config, index) {
  const items = config.form.items.filter((_, itemIndex) => itemIndex !== index)
  return { ...config, form: { ...config.form, items }, pagination: { ...config.pagination, total: items.length } }
}

function insertField(config, index, item) {
  const items = [...config.form.items]
  items.splice(index, 0, item)
  return { ...config, form: { ...config.form, items }, pagination: { ...config.pagination, total: items.length } }
}

function byteLength(text) {
  return Buffer.byteLength(text, 'utf8')
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

async function writePair(name, left, right, pretty) {
  const leftText = pretty ? `${JSON.stringify(left, null, 2)}\n` : `${JSON.stringify(left)}\n`
  const rightText = pretty ? `${JSON.stringify(right, null, 2)}\n` : `${JSON.stringify(right)}\n`
  const leftPath = join(outDir, `${name}-参考.json`)
  const rightPath = join(outDir, `${name}-目标.json`)
  await writeFile(leftPath, leftText, 'utf8')
  await writeFile(rightPath, rightText, 'utf8')
  console.log(`${name}: 参考 ${kb(byteLength(leftText))} / 目标 ${kb(byteLength(rightText))}`)
}

const pairs = [
  {
    name: '01-小文件-稀疏改动',
    fieldCount: 200,
    pretty: true,
    mutateItem: sparseMutate,
  },
  {
    name: '02-中文件-稀疏改动',
    fieldCount: 900,
    pretty: true,
    mutateItem: sparseMutate,
  },
  {
    name: '03-大文件-稀疏改动',
    fieldCount: 4200,
    pretty: true,
    mutateItem: sparseMutate,
  },
  {
    name: '04-中文件-散落改动',
    fieldCount: 900,
    pretty: true,
    mutateItem: scatteredMutate,
  },
  {
    name: '05-大文件-压缩原文',
    fieldCount: 4200,
    pretty: false,
    mutateItem: sparseMutate,
  },
]

await mkdir(outDir, { recursive: true })

for (const pair of pairs) {
  const left = pageConfig({
    title: '列表页',
    pageSize: 10,
    fieldCount: pair.fieldCount,
    extraColumn: false,
  })
  let right = pageConfig({
    title: '列表页',
    pageSize: 20,
    fieldCount: pair.fieldCount,
    extraColumn: true,
    mutateItem: pair.mutateItem,
  })
  right = omitField(right, 8)
  right = insertField(right, 30, fieldItem(99999, '（新增）'))
  await writePair(pair.name, left, right, pair.pretty)
}

console.log(`已写入 ${outDir}`)
