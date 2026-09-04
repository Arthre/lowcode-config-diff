# Merge 模块

对照合并工作台（feature：`src/features/merge/`）。纯引擎仍在 `src/core/`，本模块不得反向污染 core。

## 边界

| 目录           | 放什么                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------- |
| `components/`  | `TwoWayMergeEditor`、`DiffMinimap`、`MergeSearchDock`、`MergePaneEmptyState`、`DownloadMenu` |
| `composables/` | Vue 耦合副作用（如 `useMergeSideImport`）                                                    |
| `lib/chunk/`   | 块类型、导航锚点、缩略轨布局/快照、写回公式                                                  |
| `lib/editor/`  | CM6 主题/扩展、Sticky、折叠、doc sync、横向滚动、按行 diff                                   |
| `lib/import/`  | 导入预处理、示例文档、拖放判栏（`dragHit`）                                                  |
| `lib/export/`  | 右栏导出描述与下载打包                                                                       |
| `lib/policy/`  | 大文档阈值、状态消息语气                                                                     |
| `lib/json/`    | JSON 校验/格式化纯函数（`document.ts`）                                                      |

壳层主题见 `src/features/shell/`；UI 原语见 `src/components/ui/`。活文档总表见 [../ui/README.md](../ui/README.md)。

## 已删除

差异目录树（原 `ChunkJumpList` 及配置项分组 / 路径定位依赖链）已从源码删除，不保留开关。历史 specs/plans 可能仍写旧路径。
