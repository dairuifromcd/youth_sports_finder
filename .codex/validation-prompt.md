# 仅当前项目的自定义角色运行验证

你是这次验证的临时 Main/Orchestrator，不做产品开发。
工作目录必须是 Youth Sports Finder 项目根目录。阅读 AGENTS.md 与 .codex/WORKFLOW.md。
不得改动产品代码、依赖、测试/源数据、TASK-007 历史记录、其他项目或全局配置。
只在 output/workflow/2026-11-03/ 下保存本次验证证据。

必须使用 Codex 的实际自定义角色选择机制分别 spawn `developer`、`qa`、`uat`。
不能用 default/worker 改名、复制角色指令、Main 模拟角色或让子代理读配置答案代替加载。
若没有自定义角色选择能力，报告实际工具参数/错误并停止，不能声称验证通过。
不要把角色加载标识填入子代理提示；要求它从已加载的 developer instructions 中返回。
每次保留实际 spawn 的角色参数、返回的 agent ID、加载标识和真实工具能力。

1. developer：只验证自己的角色加载、当前目录和可用工具；检查任务与现有命令，返回
   自检计划。不得修改产品或配置，也不修复缺陷。报告保存到证据目录 developer.md。
2. qa：在 developer 返回后实际 spawn；独立检查配置边界、产品文件未变，以及运行现有
   npm test、npm run check、npm run lint、npm run build。测试临时目录必须指向当前项目
   output/workflow/2026-11-03/tmp；不运行任何抓取、地理编码或部署脚本。保存 qa.md。
   不以 developer 的计划/报告代替自己的执行结果。Fail 则记录，不修复产品。
3. uat：QA 通过后实际 spawn；直接阅读 docs/tasks/TASK-007.md 的验收标准，忽略其中
   历史 Pass 结论，只访问 Main 提供的当前项目 loopback URL。不得读取其他浏览器项目/标签。
   使用已有、已获批的浏览器工具，真实完成搜索、点击、地图/Marker、滚动和截图。
   重点独立检查 F01/F02/F03：1470×672 Booval 滚至最后一个组织；1440×1000 Enter/Space
   的实际焦点、关闭/Escape；390×844 Booval 与 Runcorn；补充较短高度。
   实际点击七个共享地址组织中的不同记录，验证列表焦点；检查控制遮挡、地图可用性。
   必须保存并查看自己的桌面/移动端截图。可用 DOM/Console/Network 辅助，不能只靠 DOM、
   源码、旧报告或模拟结果宣布 UAT 通过。不新增或下载依赖，不访问其他服务作发现/地理编码。
   将实际操作、尺寸、截图路径、Console/Network、Pass/Fail/Not Verified 和能力限制
   写到 output/workflow/2026-11-03/uat/report.md。发现产品缺陷只报告，不修复。

遇到权限/工具/网络阻塞，停止相应步骤并具体记录，不放宽沙箱、不关闭安全保护，不自动安装。
本次不执行修复循环；将未来最多三轮的闭环作为配置流程，不能借此修复 TASK-007。
最后等待三个实际子代理并汇总，区分“配置加载”“子代理调用”“浏览器能力”“产品 UAT”。
未执行项只能 Not Verified。不要宣称独立 owner Work UAT 已通过。
