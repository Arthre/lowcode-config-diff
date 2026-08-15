export function formatPath(path: string[]): string {
  if (path.length === 0) return '(root)'
  return path.join('.')
}
