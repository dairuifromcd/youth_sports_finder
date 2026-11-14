# Youth Sports Finder — Basketball V2 工作规范

## 1. 目标与范围

- 工作模式：**Fast Delivery + Repeatable Automation + Practical Data Quality**。
- Basketball Only：仅支持澳大利亚青少年 Basketball。
- 帮助家长发现附近有 Association 关联的 Clubs 及普通球队的日常训练场地。
- 以 [V2 Scope](docs/V2-SCOPE.md) 和当前 Owner 批准任务为范围依据。
- 历史 `docs/tasks/` 是 V1 参考，不自动成为 V2 需求、流程或验收标准。
- 只读取与当前任务有关的历史实现，不重新审查整个 V1 研究历史。
- 不擅自修改验收标准、扩大范围或启动下一任务。

## 2. Association-first Discovery

核心 Pipeline：

`State Associations → Affiliated Clubs → Regular Training Venues → Training Addresses → G-NAF Coordinates → Static JSON/GeoJSON → Map`

- 从官方 Basketball Associations 开始发现 Clubs，保留明确的关联证据。
- 仅主动调查与官方 Basketball Associations 有明确关联的 Clubs。
- 青少年项目适用性需要公开证据；不把普通场馆当成青少年 Club。
- 优先识别普通球队的 Regular Training Venues。
- 区分日常训练、比赛场地、假期 Camp、一次性活动和办公/通讯地址。
- 不因 Club 参加某场比赛，就推断该场馆是其训练地点。
- Training Venue 与 Club 的关系必须有公开来源支持。
- 来源不清、过期或互相冲突的记录进入 Review Queue，不凭猜测补齐。

## 3. 交付与自动化

- 优先交付一条真实数据可运行的端到端 Pipeline，再逐步扩展。
- 先一个 Association，再 Greater Brisbane、QLD，最后逐州扩展全国。
- 采用简单、可维护的实现，避免无关重构和过度工程化。
- 重复性发现、解析、地址处理和导出尽量自动化。
- 支持缓存、增量更新、批量处理及明确的刷新方式。
- 重复运行应复用有效结果，保持稳定标识符，避免重复 Club 或 Venue。
- 单条缺失或冲突进入 Review Queue，不阻塞其他明确记录。
- 系统性错误应清楚报告，避免损坏已有可用输出或静默丢弃数据。
- 保留运行摘要、失败原因及可重现的输入/输出版本信息。
- 网络采集仅在任务授权范围内执行，遵守来源访问规则并合理限速。

## 4. Practical Data Quality

- 保留来源 URL、采集/核查时间、原始名称与地址以及转换关系。
- Association affiliation、青少年适用性、训练关系与地址匹配分别记录证据。
- 不伪造数据、来源、坐标、时间或验证结论。
- 原始数据、缓存、派生数据、公开静态产物分别管理。
- 公开来源不代表可直接发布全部内容；遵守许可与隐私边界。
- 简单且明确的记录可自动处理，不要求每条人工审批。
- Review Queue 应说明缺失/冲突字段、来源和后续处理原因。
- 基本 QA 覆盖必要字段、重复记录、关联完整性、坐标范围与精度标签。

## 5. G-NAF 与坐标精度

- G-NAF 是默认本地离线地理编码数据源。
- 不自动下载 G-NAF、调用第三方地理编码 API 或引入付费服务。
- 本地 DuckDB/Parquet 可用于处理索引，不代表引入线上数据库。
- Basketball Hall、School/Campus、Property 级坐标均可接受。
- 每个坐标必须正确标明精度、匹配依据和数据来源。
- School/Campus 或 Property 坐标不能描述为精确球馆、入口或球场坐标。
- 不要求继承 V1 Queensland Geocoder PC/100 验收标准或多阶段审批体系。
- 地址匹配仍需合理一致；明显冲突、多候选不清或缺失不能强行匹配。
- 未解决的定位记录保留在 Review Queue，不作为已定位 Marker 输出。
- 只有训练关系有证据且定位符合 V2 精度规则的记录，才可作为训练场地展示。

## 6. 技术与用户体验

- 优先复用 React、TypeScript、Vite、MapLibre GL JS 和现有 CSS。
- 采用本地数据处理，生成静态 JSON/GeoJSON 供前端消费。
- 未来部署目标为 Cloudflare Pages Free；部署须另获 Owner 授权。
- 不引入用户账户、后端数据库、复杂时间表或付费基础设施。
- 新依赖、第三方数据 API 和架构变更必须符合当前任务授权。
- 搜索、列表、共享场地、多 Club Marker 与地图联动保持清晰一致。
- 地图与文案明确表达坐标精度和数据限制。
- 重视桌面/移动端布局、弹窗裁切、触控和键盘操作。

## 7. 按风险验证

- 使用项目现有 npm scripts，选择与变更相关的测试与构建检查。
- 简单任务：Main 实现并执行相关检查，无需强制 Subagents。
- Data Pipeline：真实数据样本运行、基本数据 QA 和重复运行检查。
- 高风险数据变更：Developer 实现，再由 Independent QA 独立验证。
- UI 任务：相关测试，必要时执行真实浏览器 UAT。
- Publication：公开数据检查和 Owner 明确授权。
- 具体流程见 [.codex/WORKFLOW.md](.codex/WORKFLOW.md)。
- 按需使用 `.codex/agents/` 中的 Developer、QA、UAT，不强制完整链路。
- 自定义角色未加载时，可用当前会话能力完成低风险任务并如实说明。
- 不得用普通子代理改名，冒充已加载的自定义角色或独立验收。
- QA/UAT 继承父会话权限；不编辑要求不代表技术只读隔离。
- 不跳过失败检查或降低标准；未执行、受阻检查标记 Not Verified。
- 对需要独立 QA/UAT 的任务，不得用实现者自测替代独立判断。
- 默认最多自动修复三轮；仍失败则报告，不擅自扩大任务。

## 8. 安全、权限与隐私

- 严格遵守全局安全规则、运行时 Sandbox、工具审批及当前任务授权。
- 默认只修改当前项目内、属于已授权任务的文件。
- 不修改 V1 Worktree、Branch、Frozen Tag 或全局 Codex/Git 配置。
- 项目外文件、应用、服务、缓存、临时目录或网络资源可能受影响时，先检查授权。
- 未获授权的项目外影响，必须说明操作、资源、影响、风险、恢复方式及安全替代方案并取得批准。
- 优先复用项目本地依赖和隔离环境；不擅自安装全局工具。
- 不关闭 Sandbox、不改权限、不切换工具绕过审批拒绝。
- 不访问、复制、上传或披露与项目无关的个人或工作敏感信息。
- 不采集儿童个人信息；只保留任务必要的公开组织/场地资料。
- 密钥、环境文件、G-NAF 原始数据、本地索引、原始采集缓存和私有研究资料不进入公开产物。
- `.gitignore` 不替代公开数据审查，也不会保护已跟踪文件。
- 未经明确授权，不自动 Commit、Push、Deploy、对外发布或使用付费服务。
- 浏览器仅访问已授权目标；必须按工作流安全关闭本轮测试会话并保留实际证据。

## 9. 交付与停止

- 简短报告变更、实际验证结果、剩余问题及必要证据/被测版本。
- 若当前批准任务有 Implementation Result，更新该任务记录；不为 V2 改写 V1 历史结论。
- 清楚区分 Pass、Fail、Not Verified，不把计划功能描述为已经实现。
- 仅在必要验收全部通过后报告任务 Pass。
- 完成当前任务后停止，等待 Owner 验收，不自动开始下一阶段。
