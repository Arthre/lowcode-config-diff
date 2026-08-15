const isAgentPath = (file) =>
  file.includes('.agents/') ||
  file.includes('.agents\\') ||
  file.includes('.claude/') ||
  file.includes('.claude\\')

const filterProjectFiles = (files) => files.filter((file) => !isAgentPath(file))

export default {
  '*.{js,ts,vue,json,css,md}': (files) => {
    const targets = filterProjectFiles(files)
    return targets.length ? [`prettier --write ${targets.map((f) => `"${f}"`).join(' ')}`] : []
  },
  '*.{js,ts,vue}': (files) => {
    const targets = filterProjectFiles(files)
    return targets.length ? [`eslint --fix ${targets.map((f) => `"${f}"`).join(' ')}`] : []
  },
}
