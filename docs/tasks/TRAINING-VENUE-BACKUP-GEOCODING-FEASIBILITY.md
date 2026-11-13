# Training Venue Backup Geocoding Feasibility — PLS API & G-NAF

执行日期：**2026-11-13，Australia/Brisbane**。任务范围：**Research Only + Strictly Bounded Technical Feasibility**。

**Research Completed with Blocking Unknowns。当前推荐 Option A，保留 Batch 为正式验收来源；Option C 仅作为有条件的后续方向。** 本轮没有足够证据宣布 Research Pass、API 可投产或 G-NAF 可进入 Accepted。

## 调查范围与实际执行

读取批准请求、项目 AGENTS/工作流、既有数据准备、政策审查/实施、覆盖研究、地址优先级和 Phase 2A 记录；检查实际代码、原始政府 CSV/Provenance/Mapping、PS079 证明与 Phase 2A 私有来源链。Git-ignored 输入实际存在；没有从概要重造原始结果。原观察不等于保存了完整 HTML/PDF 字节。

实际加载项目自定义 `developer`、`qa`，分别返回配置加载标识；canonical task IDs 与权限限制保存在本轮私有 manifest。没有 UI 改动，UAT、浏览器/服务器生命周期均 **Not Applicable**。

证据目录：`output/workflow/2026-11-13/training-venue-backup-geocoding-feasibility/`，已被现有 Git ignore 覆盖。详细地址、原始政府值、内部来源链和保护清单仅存该目录；此概要不公开它们。

## 官方服务及访问结论

- [PLS-Public 目录](https://www.data.qld.gov.au/dataset/property-location-service)宣称免费、无需认证；但本轮未取得可核验的当前公开 REST 操作契约、请求/响应 Schema 及适用调用限制。**当前匿名运行能力 Not Verified**，不能仅凭目录声明自动使用。
- [PLSplus-Public 目录](https://www.data.qld.gov.au/dataset/property-location-service-plus-public-json)同时含免认证与“现在需要认证”的描述。可能涉及时间、版本或 REST/SOAP 差异，但没有证据解决冲突。只确认其明确列出的 SOAP WSDL 描述符 URL；未读取 WSDL 或调用服务，REST 实际认证要求 **Unknown**。
- [政府专用 Plus-QG OpenAPI](https://raw.githubusercontent.com/qld-gov-au/PLSplus-QG-spec/master/swagger-v3.yml)明确记录 POST JSON/BasicAuth 与 QG base/operations，不能移植为 Public 接口。未申请政府权限。
- [Geocoder 指南](https://www.qld.gov.au/environment/land/title/addressing/geocoder)确认其结果由 PLS 提供；[当前界面](https://geocode.information.qld.gov.au/validate)显示 QALI/QSCF 迁移通知。不能由共同政府来源推定各接口评分、数据版本或部署后端等价。

目录正文仅通过官方页面的 indexed body 取得，直接打开遇到 JS verification；QSpatial 详情链接有 reader redirect-loop 限制。政府指南、当前界面与 QG 规范已读取实际正文。访问限制不是已证明的 API outage，也没有复现或诊断 Owner 报告的 SignalR 故障。没有绕过验证或探测前端私有接口。

## 三次上限及兼容性

**成功 0 / 失败 0 / 未执行 3；实际地址查询总数 0。** 普通已 Accepted 参考、Phase 2A 后缀地址及未解决多候选案例均已选定并核本地证据。公开 endpoint/访问条件/限制的前置条件不齐，因此停止实测。JSON 逐项将未发生的请求、HTTP 状态、字段值、坐标、响应 hash 记录为 null / Not Verified；没有 Mock 或所谓成功响应。

公开 REST 的 PC、Confidence 100、完整地址/Property 字段、候选全集和 CRS 均未验证。G-NAF 的 contributor confidence 与 Batch 匹配分数语义不同；同名 PC 不能建立跨来源验收等价。未来可复用地址角色、来源绑定、稳定 Site ID、组件比较及数值检查；必须另建来源专属候选/证据适配器，不能伪造政府 InputIndex、echo、PC/100 或 Batch receipt。PS079 仍只适用原专属证明与精确历史行。

## G-NAF / Core 与下一步

[官方 release index](https://docs.geoscape.com.au/en/stable/gnaf.html)本轮可验证最新列为 **August 2026**；未确认 November release 已交付。Core PSV、active/retired 分离、默认地址点和 GDA2020 字段支持设计针对 17 地址的流式候选查找，仍需独立校园/训练身份核验。默认点不是球馆、Court 或入口。

[Core 请求页](https://geoscape.com.au/request-g-naf-core/)列明 fee-free，但当前文件 URL、实际体积、QLD-only 下载及取得流程未确认；未提交申请。本轮没有本地官方 G-NAF 数据可执行匹配，实际命中率、磁盘/RAM/时间均 **Not Verified**。不下载全国数据、不安装数据库/Docker/GIS/依赖。

[当前链接的 Core v2 EULA](https://geoscape.com.au/wp-content/uploads/2024/11/GNAF-Core-EULA-v2.pdf)包含归属/修改说明、邮寄地址验证限制及可书面退出的客户商标宣传条款；不能只称普通 CC BY。完整 open G-NAF 是另一许可通道，当前原始 EULA 文本未完整核到，获取前须核实际附带许可。免费数据不等于免费且免认证的 Geoscape API。

**不立即实施 B 或完整 C。** A 保留已获批的严格正式来源；C 要先证明数据可合法取得、资源规模可接受及 17 地址候选查找有价值。若 API 仍不可用，可另批取得官方小范围/QLD 数据并做候选试验；Batch 恢复后，另批真正上传和独立部分批次对账。若两者均不可用，保留原状态。官方 Public 契约/使用条件、真实候选响应及明确跨接口语义证明，才可能改变 API 决策；三次成功本身不足以证明长期可靠性。

后续候选试验预计只新增研究 matcher、来源快照/receipt、候选 ledger 与针对性测试，复杂度中等；更新、许可/schema、retired/alias 和争议审查形成维护负担。正式 Validator、现有生产数据与 UI 不在该试验范围。下载规模/流程/许可、新模块和任何正式集成都有独立 Owner Decision Gates；本报告不授予后续权限。

## 保护基线与证据

| 保护项 | 本轮要求 |
| --- | --- |
| Providers / eligible associations / physical sites | 54 / 70 / 58，不变 |
| Accepted / Ambiguous / Rejected / Pending | 16 / 11 / 1 / 30，不变 |
| Current Confirmed / Official Listed Unknown | 32 / 38，不变 |
| Provider Address 总数 / Accepted / Markers / List-only | 54 / 25 / 19 / 29，不变 |
| 16 Accepted | 完整记录、坐标、精度和证明不变 |
| 旧政府 Batch | 28 行、448 canonical cells、receipt/mapping/hash 不变 |
| Phase 2A | 17 行保持原样，仍 Pending；CSV/Mapping/Registry 和全部旧证据不变 |
| PS079 | 原 PC/97 专属例外及六份证明不变 |

Phase 2A CSV SHA-256：`55ddf60779f3e234df8eb6b3e5be01914476c574ad1033e2f82a7beccd6a1e25`。

Mapping SHA-256：`62621fee85d26045cf2e5aa54f9514a087e197b77805ec2917cef1dfd0a8e8d1`。

| 私有交付文件 | 内容 |
| --- | --- |
| `official-service-catalog.md` | 分开的 Public REST/Plus REST/Plus SOAP/QG、访问/许可/限制与来源 |
| `pls-api-feasibility.md`、`bounded-api-test-results.json` | 真实零查询、三个未执行槽位、历史对照和停止理由 |
| `api-schema-compatibility-matrix.md` | 逐字段五级语义分类及 Q1–Q8 |
| `gnaf-feasibility.md` | 获取/许可/Schema/CRS/更新/资源风险和17地址策略 |
| `fallback-options-comparison.md` | 四种来源的可靠性、准确性、费用与维护对比 |
| `recommended-architecture.md` | A/B/C 判断及十项明确建议 |
| `next-phase-proposal.md` | 最小后续范围、拟议模块与决策门槛 |
| `qa/report.md` | 独立 QA、实际核验与未验证项 |
| `COMPLETION-HANDOFF.md` | 15 个最终验收问题的直接回答 |
| `before-manifest.json`、`main/local-evidence-audit.json` | 19,696 既有文件快照及实际历史数据抽查 |
| `role-runtime-manifest.json`、Developer/QA version manifests | 实际角色及受审版本 |

## Implementation Result

研究文档和候选验证方案已完成；正式技术集成未实施。**独立研究质量与安全 QA Pass，无遗留报告缺陷；整体结论仍为 Research Completed with Blocking Unknowns。** QA 独立核验官方来源、实际零查询、逐字段边界和全部十项交付，重算 19,696 个保护文件的 SHA-256/size/mtime，零漂移；Main 独立重算得到相同结果。新文档空白、相对链接、JSON 及 Git ignore 边界检查通过，受审版本保存在 `qa/reviewed-version.json`，最终状态整合另行核验。产品测试/构建未执行：未修改可执行产品代码，按本任务采用独立只读数据/hash 审计。UAT **Not Applicable**。QA Pass 不证明接口可用、PC/100 等价或未来匹配成功。

未 Commit、Push、PR、部署、发布、付费、上传任何批次或修改项目外资源。完成本轮即停止，等待 Owner 验收与下一阶段授权。
