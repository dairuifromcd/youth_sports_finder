# Youth Sports Finder — Basketball V2

帮助澳大利亚家长通过搜索、列表和地图发现附近有官方 Association 关联的青少年 Basketball Clubs，以及普通球队的日常训练场地。

V2 采用 **Fast Delivery + Repeatable Automation + Practical Data Quality**。
范围、MVP 标准及扩展顺序见 [V2 Scope](docs/V2-SCOPE.md)。

## 核心 Pipeline（开发目标）

`State Associations → Affiliated Clubs → Regular Training Venues → Training Addresses → G-NAF Coordinates → Static JSON/GeoJSON → Map`

从一个真实 Association 开始，自动发现有明确关联的 Clubs，提取公开来源支持的常规训练地点，
使用本地 G-NAF 匹配地址并生成静态数据。支持缓存、增量更新、批量处理和异常 Review Queue。
先一个 Association，再 Greater Brisbane、QLD，最后逐州扩展全国。

接受正确标记精度的 Basketball Hall、School/Campus 或 Property 坐标。
不把比赛场地、假期 Camp 或办公地址自动当成日常训练场地，也不要求沿用 V1 的 PC/100 审批体系。

**当前新 Pipeline 尚未实现。** 本次 Bootstrap 只调整开发指令与范围，没有新增抓取、G-NAF 导入或训练场地地图数据。

## 技术选型

- 前端：React、TypeScript、Vite、MapLibre GL JS、CSS。
- 数据：计划本地处理和 G-NAF 离线地理编码，输出静态 JSON/GeoJSON。
- 本地索引可采用 DuckDB/Parquet；目前不代表已集成这些工具。
- 未来部署：Cloudflare Pages Free；尚未创建 V2 Cloudflare Project 或部署。
- 不引入用户账户、后端数据库或付费基础设施。

## 本地运行现有 React/Vite 项目

使用 Node.js 22.12+ 和 npm。在项目目录内运行：

```sh
npm install
npm run dev
```

打开 Vite 输出的 localhost URL。依赖安装/网络访问仍需遵守当前环境权限；Bootstrap 本身不执行安装。
定位功能需要 localhost 或 HTTPS；拒绝定位、超时或不可用时回退至 Brisbane。
现有地图底图需要互联网访问。

现有检查与预览命令：

```sh
npm run check
npm run lint
npm test
npm run build
npm run preview
```

按任务风险选用相关检查，不要求每次改文档都运行完整 V1 测试或浏览器 UAT。

## V1 继承代码与 V2 目标的区别

当前应用仍使用 V1 固定 Queensland Play On Basketball 样本；继承基线包含 54 个 Provider、
25 个接受的 Provider Address 点、19 个地图位置，其他记录仅列表展示。
这些是登记地址/Property 坐标，不是已验证的训练或比赛地点，也不证明青少年项目当前可用。

- [src/data/playOn.ts](src/data/playOn.ts) 仍导入 V1 validated 数据。
- [src/ClubMap.tsx](src/ClubMap.tsx) 和 [src/ProviderList.tsx](src/ProviderList.tsx) 提供现有地图/列表界面。
- `scripts/` 内 Play On、Nominatim、Queensland benchmark 和训练地点工具属于历史实现，
  不等于 V2 Association-first/G-NAF Pipeline；启动应用不会自动运行这些采集或地理编码命令。
- [docs/tasks/](docs/tasks/) 保留 V1 任务与实现记录，仅作参考，不自动成为 V2 验收标准。
- V1 `main` 与 `legacy-v1-2026-11` 冻结版本保留；V2 开发在 `basketball-v2` 分支进行。

## 开发与数据边界

规则见 [AGENTS.md](AGENTS.md) 和 [.codex/WORKFLOW.md](.codex/WORKFLOW.md)。
按风险选择实现、相关测试、真实数据 QA 或浏览器 UAT，不强制每个任务调用全部 Subagents。

原始采集缓存、G-NAF 原始数据、本地索引、密钥及私有研究资料保持本地，不属于公开静态数据。
历史私有输入未随仓库分发，相关 V1 审计不能仅凭全新 clone 完整重现。
`.gitignore` 不会移除已跟踪文件；公开产物仍需来源许可、隐私和秘密检查。
未经 Owner 明确授权，不自动 Commit、Push、Deploy、发布或使用付费服务。
