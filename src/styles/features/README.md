# styles/features

按功能扩展的样式放这里（如 `editor.scss`、`settings.scss`）。

规则：

- 仅某一功能、且会跨多个组件复用时才新建文件
- 仅单个 `.vue` 使用 → 优先组件内 `<style lang="scss" scoped>`
- 新颜色 / 圆角 / 阴影 → 改 `../tokens.scss`，不要在本目录重复定义
- 新增文件后在 `../index.scss` 末尾增加 `@use './features/<name>'`
- 统一使用 `.scss` 后缀（不用 `.css`）

当前无独立功能样式文件。
