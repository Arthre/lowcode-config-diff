/** 从拖放或文件选择器中取出优先的 JSON 文件。 */
export function pickJsonFile(fileList: FileList | null | undefined): File | null {
  if (!fileList || fileList.length === 0) return null
  const files = Array.from(fileList)
  const jsonFile = files.find(
    (file) => file.type === 'application/json' || file.name.toLowerCase().endsWith('.json'),
  )
  if (jsonFile) return jsonFile
  const plain = files.find((file) => file.type === '' || file.type === 'text/plain')
  return plain ?? files[0] ?? null
}
