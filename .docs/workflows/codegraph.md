# CodeGraph 上下文协议

> **触发时机**：每次查看代码、分析实现、调试或修改代码之前（不是仅任务开始时一次，而是每一轮涉及代码的动作之前）。 **核心规则**：先全量更新 CodeGraph，再用 CodeGraph 工具查看相关内容。

## 铁律

```
每次查看 / 修改代码前，先运行 codegraph index 更新，再用 codegraph 工具查相关内容
```

顺序不可颠倒：**先更新，后查看**。索引未更新就直接查询，可能拿到陈旧的符号与调用关系。

## 执行步骤

1. 在项目根目录运行全量更新：

   ```bash
   codegraph index
   ```

2. 根据任务选择 CodeGraph 查询方式：
   - `codegraph explore "<问题描述>"`：理解功能区域、数据流、调用路径。
   - `codegraph query "<关键词>"`：查找符号、组件、函数、类型。
   - `codegraph node "<符号或文件>"`：查看单个符号源码、调用方/被调用方，或读取文件。
   - `codegraph callers "<symbol>"` / `codegraph callees "<symbol>"`：追踪调用关系。
   - `codegraph impact "<symbol>"`：修改共享符号前分析影响范围。
   - `codegraph affected <files...>`：改动后评估受影响范围（有测试时再映射到测试文件）。

3. 结合 CodeGraph 输出再使用文件读取、搜索和编辑工具：
   - 优先让 CodeGraph 缩小范围，避免盲目全仓搜索。
   - 当 CodeGraph 未覆盖 Markdown、配置或动态运行时信息时，再用常规工具补充。
   - 如果 CodeGraph 提示索引待同步或引用文件可能陈旧，直接读取对应文件确认实时内容。

## 修改前检查

涉及共享工具、公共组件、状态管理、路由、请求封装等高影响区域时，必须至少做一次影响分析：

```bash
codegraph impact "<待修改符号>"
```

如果无法明确符号名，先用 `codegraph explore` 或 `codegraph query` 定位，再决定是否需要 `impact`。

## 完成后

- 代码变更后，依靠 CodeGraph 自动同步；如后续还要继续分析，重新运行 `codegraph status` 确认索引状态。
- 需要判断验证范围时，可用 `codegraph affected <files...>` 辅助缩小范围，再按 [完成验证](./verification.md) 执行 `pnpm lint` / `pnpm test:run` / `pnpm build`。
