---
name: 配置差异合并工具
description: 冷灰画布 + 青绿强调的 Operate 工具界面
colors:
  canvas: '#eef1f4'
  surface: '#ffffff'
  surface-raised: '#ffffff'
  border: '#d5dbe3'
  border-subtle: '#e4e9ef'
  text: '#5a6572'
  text-heading: '#0f1720'
  accent: '#0f766e'
  accent-hover: '#0d9488'
  accent-muted: '#ccfbf1'
  side-test: '#0369a1'
  side-prod: '#b45309'
  diff-added: '#047857'
  diff-removed: '#b91c1c'
  diff-modified: '#b45309'
  success: '#047857'
  danger: '#b91c1c'
  muted: '#7b8794'
  code-bg: '#f1f4f7'
  focus-ring: '#0f766e'
colorsDark:
  canvas: '#0c1014'
  surface: '#151b22'
  surface-raised: '#1a222c'
  border: '#2a3441'
  border-subtle: '#222a34'
  text: '#9aa6b2'
  text-heading: '#eef2f6'
  accent: '#2dd4bf'
  accent-hover: '#5eead4'
  accent-muted: 'rgba(45, 212, 191, 0.14)'
  side-test: '#38bdf8'
  side-prod: '#fbbf24'
  diff-added: '#34d399'
  diff-removed: '#f87171'
  diff-modified: '#fbbf24'
  success: '#34d399'
  danger: '#f87171'
  muted: '#7a8694'
  code-bg: '#121820'
typography:
  display:
    fontFamily: 'Sora, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.75rem'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '-0.02em'
  title:
    fontFamily: 'Sora, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.05rem'
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: '-0.02em'
  body:
    fontFamily: 'Sora, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: '0'
  body-sm:
    fontFamily: 'Sora, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: '0'
  caption:
    fontFamily: 'Sora, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '0'
  mono:
    fontFamily: 'IBM Plex Mono, ui-monospace, Consolas, monospace'
    fontSize: '0.8125rem'
    fontWeight: 400
    lineHeight: 1.45
rounded:
  xs: '2px'
  sm: '6px'
  md: '10px'
  lg: '14px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '32px'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '#ffffff'
    rounded: '{rounded.md}'
    padding: '10px 20px'
  button-primary-hover:
    backgroundColor: '{colors.accent-hover}'
    textColor: '#ffffff'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.text-heading}'
    rounded: '{rounded.md}'
    padding: '8px 12px'
  panel:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text-heading}'
    rounded: '{rounded.lg}'
    padding: '{spacing.lg}'
  badge-added:
    backgroundColor: '#d1fae5'
    textColor: '{colors.diff-added}'
    rounded: '{rounded.sm}'
    padding: '2px 8px'
  badge-removed:
    backgroundColor: '{colors.diff-removed}'
    textColor: '#ffffff'
    rounded: '{rounded.sm}'
    padding: '2px 8px'
  badge-modified:
    backgroundColor: '#fef3c7'
    textColor: '{colors.diff-modified}'
    rounded: '{rounded.sm}'
    padding: '2px 8px'
---

# Design System

## Overview

Operate 模式的可编辑双栏文本合并工作台：冷灰画布托起表面与导入坞，青绿用于导入、复制/下载与焦点。语义色区分「参考」与「结果」侧标签；扫读优先于装饰。访客成功标准是完成「导入 → 块级 `→` / 编辑 → 导出右栏」，不是停留欣赏。

## Colors

| 角色                  | 用途                                       |
| --------------------- | ------------------------------------------ |
| canvas                | 页面底                                     |
| surface / raised      | 导入坞、面板表面                           |
| accent                | 下载等主操作、导入强调、焦点环、`→` 控件色 |
| side-test / side-prod | 「参考」/「结果」侧标签色点                |
| diff-*                | 设计系统保留语义色（Merge 高亮走 CM 主题） |
| success / danger      | 导入/导出状态提示                          |
| code-bg               | Merge 编辑器外框与代码底                   |

暗色主题单独设计 elevation（更深 canvas、略亮 surface），禁止把浅色紫系机械反转。Token 挂在 `html.dark`（非仅 `prefers-color-scheme`），以便手动切换。

## Theme toggle

- 入口：页眉右侧太阳/月亮按钮（`ThemeToggle`）
- 状态：`useDark`（VueUse）+ `localStorage` 键 `lcd-color-scheme`；首次无存储时跟随系统偏好；`index.html` 内联脚本防 FOUC
- 过场：支持时用 **View Transitions API**（约 340ms，对称缓动）：亮→暗为亮色*收回*，暗→亮为亮色*进入*；CSS 首帧驱动动画 + 暗色过渡底抑白闪；不支持或 `prefers-reduced-motion: reduce` 时瞬时切换
- 编辑器：CodeMirror 主题用 CSS 变量，随 `html.dark` 同步

## Typography

- UI：Sora（有个性但不花哨）
- 代码 / path / JSON：IBM Plex Mono
- 标题靠字重与字号，不用 eyebrow / kicker

## Layout

- **满高单列工作台**：页眉 → 双栏 Merge（栏头导入）；`.ui-workspace` 纵向 flex，Merge `flex: 1; min-height: 0` 吃剩余高度；视口高 `.ui-page` `100svh` + `overflow: hidden`
- **Merge 双栏**：左参考、右结果，始终左右并排；中间 revert 槽放置 `→`；宿主可 `overflow-x: auto`；右侧双栏代码缩略快照（字符色块 + 视口框）；查找条在栏头与编辑器之间，不覆盖代码
- **窄屏**：仍左右并排并可横滑；**禁止** `.cm-mergeViewEditors { flex-direction: column }`（纵向堆叠会对错 revert 行）
- **页眉 = 全宽半透明层**（透 canvas，不用白色 surface；轻模糊分层），不吸顶、不高卡片；工具：差异块计数、上一条/下一条、查找、复制、下载菜单（原文 / 压缩）、`ThemeToggle`、隐私提示
- **无** Diff 树、选边分栏、拖拽分隔条、`lcd-workspace-main-pct` 占比持久化
- 组内紧、区间松；导入坞圆角 `md`；不做 01/02/03 步骤编号、不做指标仪表盘

## Elevation & Depth

- 阴影梯级：`sm`（导入坞、品牌标、弱表面）、`md`（拖拽强调）、`lg`（raised 面板）
- 面板：淡边框 + 软偏移阴影（非零模糊）；阴影加强时边框略淡，避免发脏
- 背景：冷灰底 + 顶部极淡青绿径向光 + 细点阵纹理（固定附着，非装饰 glow）
- 禁止彩色光晕、厚色左边框装饰条

## Icons

- 集合：Iconify **Lucide**（UnoCSS `presetIcons`，类名 `i-lucide-*`）
- 尺寸约 16–18px；按钮内与文字 `gap` 对齐；装饰图标 `aria-hidden`
- 品牌：`git-compare`；导入/会话：`upload` / `clipboard` / `trash-2`；导出：`copy` / `download`；查找：`search`；主题：`sun` / `moon`

## Shapes

- 控件圆角 `sm`–`md`；面板 `lg`
- 避免 `rounded-full` 药丸堆叠

## Components

- **Primary button：** 实心 accent（页眉下载等）；禁用时用 `accent-muted` 底而非死灰
- **Soft button：** 浅绿底 accent 字（选择文件、粘贴为该侧全文）
- **Ghost / 默认按钮：** 透明或弱边框（块导航等）
- **Danger：** 危险色字与淡边框（清空）
- **Dropzone：** 导入坞；拖拽中 accent 描边；错误时 danger 描边 + 中文提示
- **Side labels：** `.ui-label-test` / `.ui-label-prod` 色点标签（参考 / 结果），无选边 radio
- **Merge revert：** 中间 `→`，`aria-label`「将此差异写入右侧」

## Do's and Don'ts

**Do**

- 用语义色表达状态，并辅以文字标签
- 主操作唯一高饱和色（青绿）
- mono 仅用于 path 与 JSON
- 窄屏保持并排 Merge，靠横滑而不是改 column

**Don't**

- 默认紫 / 紫渐变 / Vite 模板 accent
- gradient text、emoji 图标、大面积装饰玻璃
- 厚 `border-left` 色条当卡片装饰
- 满屏等宽扮「技术感」
- 把 Merge 双栏改成上下堆叠
