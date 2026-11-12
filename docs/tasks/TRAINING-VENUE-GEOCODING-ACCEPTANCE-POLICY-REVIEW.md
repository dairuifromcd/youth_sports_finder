# Training Venue Geocoding Acceptance Policy Review

审查日期：**2026-11-12，Australia/Brisbane**。类型：Policy Review / Data Impact Assessment / Implementation Proposal。

**政策及模拟结论：待 Owner 审批；未实施。** 当前实际数据仍为 **9 Accepted / 18 Ambiguous / 1 Rejected / 30 Pending**。建议取消普遍性的第二个独立场馆所有者地址证明门槛，保留可追溯的训练关系、完整地址证据链和严格政府结果校验。现有离线资料支持七个优先场地全部拟议升级；模拟为 **16 / 11 / 1 / 30**，增加 **7 Physical Sites、7 独立 Providers、11 eligible Associations** 的坐标覆盖。

这不是取消场地身份核对：完整俱乐部地址可支持场地与地址的绑定；只有名称或地址不完整时，仍须补充同一具体场地的可靠证据，不能通过邻近同名地点推断。**Geocoding Acceptance 不等于 Venue Use Certification。**

## 1. Authority、实际版本与审查边界

- 依据 Owner 本轮原始请求、`AGENTS.md`、`.codex/WORKFLOW.md`，并读取 Data Geocoding、Same-site Aliases、Identity Evidence Binding Review 三份任务记录及 benchmark README。
- 实际 HEAD：`3715b30ac0a3c254d25808996329c5e5caa4529c`；开始时 `git status --short` 为空。以当前文件及哈希为准，不推定远程状态。
- 研究数据 as-of **2026-11-06**；来源主要 checked **2026-11-05/06**；政府下载 **2026-11-06**；现有结果 validated **2026-11-11**。本轮离线审查日期不替换上述日期，也不刷新训练时效。
- 基线：54 Providers / 70 eligible Associations / 58 Physical Sites，关联训练来源覆盖 30 Providers；32 Current Confirmed / 38 Official Listed — Current Status Unknown。政府批次 28 行，20 对候选坐标、8 行无坐标；另有 30 Pending。
- Provider Address 为独立数据集，保持 **54 Providers / 25 Accepted / 19 grouped markers / 29 list-only**。
- 新增内容仅为本文和 Git-ignored 本次证据。未执行正式准备、导入或 `--check` 生成命令；未修改现有代码、测试、生成数据、历史记录。无外网、Facebook 调查、API、上传、UI、服务器/浏览器、安装、项目外写入、commit、push、部署或发布。
- Main 负责分析与方案；实际 `agent_type=qa` 自定义角色 `/root/policy_qa` 已返回配置加载标识，运行证据单独保存。Developer 无需调用；UAT / 浏览器生命周期 **Not Applicable**。QA 的不编辑约束不代表技术只读隔离。

证据根目录：`output/workflow/2026-11-12/training-venue-acceptance-policy-review/`，已核实被 Git 忽略。`before-manifest.json` 冻结 108 份原有文件；完整政府行、研究摘要、精细地址来源、Facebook 链接等仅保留在 ignored 证据。本文不导出原研究数据。

## 2. Current Policy Audit

### 2.1 实际执行路径

1. `scripts/prepare-training-venues.mjs::generate()` 核对三份冻结研究/决策文件 hash，调用 `prepareDataset()`，检查固定 54/70/58、ID、Provider 身份与决策一致性；有政府结果时要求 CSV、provenance、validated-on 同时提供。输出路径、symlink、原始输入及已导入结果防覆盖保护均独立存在。
2. `prepare.mjs::eligible()` 要求普通每周球队训练、recommendedForParentReference 和两个已批准 temporal class 之一。`validateInputs()` 核查关联、场地、来源 Evidence ID 的存在和原有决策，不重新判读网页的实际语义。它依赖冻结研究和已审查资格，不能将存在 Evidence ID 误当作运行时自动认证来源内容。
3. `parseVenueAddress()`、`calculateTier()`、`addressConflicts()` 保留原值、门牌后缀/范围、locality/postcode、历史冲突与已解决记录。仅完整安全地址导出；不是所有 exportable 地址均可 Accepted，例如交叉路口 PS020。
4. `validateResultProvenance()`、`verifyMapping()`、`reconcileResults()` 要求 role/source、日期、SHA-256、16 列 schema、全部 InputIndex 和精确 address/locality echoes。不能按返回顺序 join。Hash 证明文件对应；政府真实性仍依赖 Owner 提供真实导出声明。
5. `validateVenueResult()` 实际为 `createVenueResultValidator()` 的返回函数，执行 `validateVenueResultWithPolicy()`。先保留候选值，将 acceptedCoordinates/precision 置空；未解决来源冲突先 Ambiguous。无坐标的多候选/解析失败维持 Ambiguous，明确零候选为 Rejected；缺失或损坏返回按严格验证处理。
6. 返回 building label 如确属另一个已知场地/校园，或明确 different/other/another campus，Rejected；未知 label 需人工独立身份核对，Ambiguous。识别名称采用明确 aliases 和完整外括号格式归一化，不采用模糊名称/距离匹配。
7. locality/street midpoint 类低精度 Rejected；非 numbered-street 自动接受被阻止。PC/100 只是严格默认的一部分。
8. `strictAddressOutcome()` 调用共享 `scripts/qld-geocoder/compare.mjs::validateResult()`。数字坐标必须有效且在宽泛 QLD 范围（纬度 −30 至 −9，经度 137 至 154.5）；street/number/locality/postcode、FullAddress 的 QLD 组件必须一致。明确其他州拒绝。缺组件、范围、单位变化、字母后缀变化、非 PC、非 100、Comment 均触发拒绝或 review，不因 Confidence 高而忽略。
9. Training wrapper 仅在完整街道 token 严格等价时处理末端 AV/Avenue、street type 后 W/West 格式；重跑原 validator 并验证其他诊断完全保留。不是自动地址别名。不能删掉街道不匹配后顺带丢掉其他拒绝条件。
10. 最后，普通 exact-address 分支要求 `originalVenueIdentityResolved` **且** `identityEvidence()` 非空（`validate.mjs` 当前第 133 行）。否则即使地址/PC/100/坐标均通过，也以 `address-match-does-not-independently-establish-venue-or-campus-identity` 保持 Ambiguous。这正是本轮七条的唯一执行阻断。
11. 无适用政府返回的场地为 Pending。`candidatesFor()` 仅投影 Accepted 坐标和声明精度，关联时效/范围/限制另行保存；publicDisplayApproved 始终 false。

### 2.2 两种 identity 机制的实际含义

`prepare.mjs::identityEvidence()` 的原十条绑定要求精确 Site/Evidence/Source/URL、venue 关系、`addressResult=Resolved`、`phase2Validation.status=Resolved`、canonical 地址，以及 summary 以该地址开头。输出 Evidence hash、checked date 和 site-address 角色。手填 reviewed=true 或任意官方域名不生效。原机制的 summary 前缀/旧 schema 限制曾造成结构性遗漏。

`reviewedIdentityEvidence()` 为 PS027、PS032、R2L-PS001 各自核对 canonical 地址、venueIds、具体 source/evidence/venue/observation/access record 全量 hash 和关联字段；它适配已审查旧研究结构，不能泛化为所有历史记录免检。2026-11-11 的三条修正已解决该结构性遗漏，本轮不重做或撤销。

两者有真实价值：在俱乐部只给名称、街道或入口时，它们提供缺失的完整地址和正确校园链（例如 PS023、PS076、R2L-PS001）。在俱乐部已经明确完整地址、没有身份冲突且严格 geocoder 匹配时，再强制所有者第二来源，超出本产品定位职责。**应调整的是“独立所有者来源一律必备”，不是“目标地址及场地无需证据”。**

### 2.3 PS079 专属分支

PS079 原始 `25 Peel Street, Manly 4179` 与政府 `77 Buderim Street, Wynnum 4178` 不一致，不能走普通俱乐部 exact-address 路径。`aliases.mjs`、`alias-chain.mjs`、`ps079-alias-binding.mjs` 的已批准六份官方 artifact hash、school/Council 身份、双地址登记、378/SL6111、EPSG:4326 无损几何、严格点内/洞外/边界处理、独立 point-intersects、exact government row hash 仍全部必要。

Confidence **97** 原样保留；只有原精确行 hash、PC、Verified alias 且严格验证仅余 `confidence-not-100` 时才可经既有裁定接受。不能扩展为 confidence ≥97 或所有同校园地址都可豁免。学校页未给门牌 25；该号码来自独立地址登记。两个地点标签/邮编的来源不能混称为单个来源支持全部组件。

## 3. Policy Decision Table

| 现有条件 | 决策 | 拟议边界 |
| --- | --- | --- |
| 官方训练来源可追溯、实际内容和发布主体明确 | Keep | 记录 Source/Evidence/URL、原 checked/published 日期、可读性及可信度；Facebook Group 须有官方发布链，不能只凭 Group 名称 |
| Regular Weekly Club/Team Training 与既有 70 项资格 | Keep | 排除比赛、单次/假期、casual、公共球场和未证实训练；本轮不增加 Association |
| 足够完整的目标地址及正确物理场地链 | Keep | Club 完整地址，或 Club 指明场地 + 经审查官方补全链；名称/邻近/Provider 地址不可替代 |
| 所有 exact-address 场地必须再有 venue owner 独立地址绑定 | Remove as Mandatory Gate | 官方 club 完整地址链 + 严格政府匹配 + 无冲突时，不再强求第二来源 |
| `identityEvidence()` / `reviewedIdentityEvidence()` 已有证明 | Revise | 保留原事实和 hash；用于补全地址、身份疑点、冲突和审计，不当作所有场地的统一硬门槛 |
| summary 前缀 / phase2 schema 是唯一可接受证据形态 | Revise | 新的经审查 club-address binding 可表达证据语义和组件；不改原研究来满足字段 |
| 独立 owner/学校地址调查 | Manual Review Only | 缺组件、多校园、名称与地址矛盾、返回未知 label、地址别名/返回疑点才触发；缺 owner 检查本身不是冲突 |
| `originalVenueIdentityResolved` / 正确稳定 Site ID | Keep | 作为结构一致性与人工复核信号；boolean 单独不能证明地址或接受坐标 |
| door number、必要字母后缀、street/type/direction、locality/postcode、QLD/Australia | Keep | 精确组件核对；澳大利亚语境来自真实 QLD 服务和返回 QLD 字段，CSV 无独立 country/datum 列，不声称新增认证 |
| 政府 row/receipt/schema/hash/InputIndex/echoes | Keep | 所有 batch 关系和真实来源声明继续保留；不重写 CSV |
| 坐标有效性、QLD 合理范围、PC、100、FullAddress、Comment | Keep | 任何一项不充分均不能自动接受；范围是粗筛，不冒充校园边界验证 |
| 范围、交叉路口、units、门牌后缀变化、多候选及解析失败 | Manual Review Only | 取消 owner 普遍门槛不解决这些问题；无坐标绝不凭空填入 |
| 已知错误校园、错误州/地址、非法或道路/区域中点坐标 | Keep | 继续拒绝，候选与 accepted 分离 |
| returned building 未知标签 | Manual Review Only | 需证实与目标场地一致；不会把 PS044/046 自动当作已知别名 |
| same-site alias / PS079 PC97 精确行裁定 | Keep | 独立证据按需必备；不推广例外，不放宽严格地址校验 |
| unresolved/historical 地址冲突 | Keep | 未解决阻止接受，已解决保留历史和角色解释；PS044/076 不丢弃冲突记录 |
| temporal class、球队/年龄、限制和 manual/disclosure review | Keep | 地理编码不升级训练时效；来源披露审查与坐标质量分开 |

## 4. Proposed Acceptance Policy（审批候选）

### Rule 1 — 官方关系来源与地址来源可分开，但链条必须闭合

关系必须来自俱乐部官方网页/正式资料、已确认官方 Facebook Page/发布内容或有官方链的 Group。记录目标 Provider、ordinary training、Venue/Site、适用时间与原观察。直接嵌入的 CDN 海报/PDF 必须保留官方父页面和观察，单个 CDN URL 不能证明发布者。

建议 Owner 明确确认：**主管协会在其官方 club directory 直接、明确发布该俱乐部普通训练场地，也可保留为官方关系来源**。这是现有 A030、A132 等资格所采用的来源类别（R2L-E036 / R2L-S034），不是新增公共目录推断。协会 membership、比赛目录或场馆预订表本身不足以证明 weekly training。若 Owner 只允许俱乐部自身发布，相关既有关联需另行重审，不能一面删掉该依据一面仍声称完整保持现九条。本方案及 16/11/1/30 模拟采用该明确来源定义，保留原 70 项资格。

地址允许两条可靠路径：

1. 官方俱乐部资料明确同一场地完整地址；政府严格匹配；不存在实质身份/地址疑点。无需额外 owner 地址页。
2. 官方关系来源只给部分地址或明确场地，已有学校/运营方/官方地址资料能证明同一具体场地并补全缺组件。必须列出哪一组件来自哪一证据；身份不清则继续 Ambiguous，不从地图邻近推断。

共享 Site 的地址资料可由另一个可确认官方俱乐部/场馆资料支持，但必须证明同一具体场地；不得把地址来源自动转换为该发布者在该地的合格 weekly association。PS009 的 Dunkstar 海报是此例：地址可用，不能新增 Dunkstar→Eagles 普通队训关系。

### Rules 2–5 — 活动、定位、条件复核、时效

- **Rule 2**：只对既有合格 Association 的目标 Site 评估；游戏、课程和学校一般活动既不授予关系资格，也不自动带出其他 Provider。
- **Rule 3**：真实政府批次可靠对应，地址组件严格一致，合法/合理坐标，默认 PC/100、无未解决返回注释和冲突；必要后缀/方向/校园不得忽略。PC 仅为 property/campus-level。空 building label 不要求额外 owner 证明；与另一个校园矛盾的 label 必须拒绝。
- **Rule 4**：仅存在上述具体疑点时，增加独立场馆或其他适当官方来源审查。owner 未核查与 owner 冲突含义不同。所有地址别名仍需专属独立证明；本轮不批准新别名、范围、后缀或低 confidence 通用例外。
- **Rule 5**：保留 Current Confirmed / Official Listed — Current Status Unknown 及原 as-of、team scope、review limitations。Current Confirmed 是原研究日期/范围内支持，不代表现在每天仍训练；新坐标不会刷新或延长有效期。

拟议决策顺序：先核真实批次和关联 → 保留硬性冲突/坐标/精度规则 → 验地址严格一致或既有专属 alias → 核完整官方地址链及正确 Site → 无具体疑点方可 Accepted。不能直接删掉 `identityEvidence.length` 条件后让一切有 PC/100 的输入通过；必须以可审计的关系/地址证据链替换它。

**状态含义维持不变**：Accepted 表示地址定位依据充分；Ambiguous 表示已有结果但还需解决问题；Rejected 表示本次返回明确不适用/无候选；Pending 表示没有本批可用返回。拒绝一个政府结果不等于否认俱乐部或场地存在。

## 5. Full 28-Row Reassessment

下表为完整 28 条的公开文档摘要；所有 Proposed 都是假设 Owner 批准后再实施的结果。包含全部要求字段的逐条矩阵保存在 ignored `full-28-row-reassessment.json`（权威完整审查表）、`.tsv` 和可读 `.md`：含 ClubSource、Source/Evidence/URL/日期、地址组件证据链、原政府 16 字段、坐标检查、owner 检查状态、blockers、风险及解释。其来源 URL 仅复用现有记录，未访问网站。

| PhysicalSiteId | Venue | Current | Proposed | 政府结果 / 关键依据或保留原因 |
| --- | --- | --- | --- | --- |
| PS003 | Calamvale Community College | Ambiguous | Accepted | PC/100，E160 club 完整地址，移除唯一 owner gate |
| PS004 | Rowland Cowan Stadium | Ambiguous | Ambiguous | 9 candidates，无选定坐标；E161 地址存在不解决候选 |
| PS005 | Iona College | Rejected | Rejected | PC/97；Lindum vs WYNNUM WEST，未经批准的 locality 差异 |
| PS009 | Eagles Sports Complex | Ambiguous | Accepted | PC/100，E186 官方海报完整地址及父页链；W/West 等价 |
| PS020 | PCYC Redlands | Ambiguous | Ambiguous | 交叉路口；解析失败，无坐标 |
| PS023 | Camp Hill school | Accepted | Accepted | PC/100；E173 club 名称/入口 + P2-E024 学校完整地址 |
| PS027 | YMCA Springfield Central | Accepted | Accepted | PC/100；A030 官方协会关系 + E178 场馆完整地址 |
| PS030 | Wishart State School | Ambiguous | Ambiguous | 11 candidates，无坐标；club 完整地址不足以选点 |
| PS031 | Hibiscus Sports Complex | Ambiguous | Ambiguous | 2 candidates，无坐标；不选最近结果 |
| PS032 | Rochedale State High School | Accepted | Accepted | PC/100；club 海报 + E184/S171 学校 prospectus 和原适配器 |
| PS037 | Moreton Bay Boys’ College | Accepted | Accepted | PC/100；club 302 Manly/Manly West，P2-E028 补 4179 |
| PS044 | Cornubia Park Sports Centre | Ambiguous | Ambiguous | PC/98；146→146–170 范围及未知 CORNUBIA PARK label |
| PS046 | Springwood Road State School | Ambiguous | Ambiguous | PC/100 仍是 94–120 范围；PRIMARY & PRE-SCHOOL label 未绑定 |
| PS049 | Wynnum West State School | Ambiguous | Ambiguous | 75 candidates，无坐标；旧 School Rd 入口线索与正式校址分开 |
| PS060 | JBS Arena / Ipswich Basketball Stadium | Accepted | Accepted | PC/100；P2-E031 补全 2A/4304，原两条普通训练关系独立 |
| PS066 | Ripley Valley SSC / Raptordome | Ambiguous | Accepted | PC/100；E205 + R2L-E185/E189，完整地址且明确 Raptordome；AV 等价 |
| PS067 | Amare Centre / Sacred Heart Booval | Ambiguous | Ambiguous | 22 candidates，无坐标；不复制 Raptordome 坐标/时间 |
| PS069 | Stretton Primary / Junior campus | Ambiguous | Ambiguous | 4 candidates，无坐标；不能混入 Senior campus |
| PS070 | Warrigal Road State School | Ambiguous | Accepted | PC/100；E208/S119 普通球队表完整地址 |
| PS071 | Nissan Arena | Ambiguous | Accepted | PC/100；E209/S119 完整地址；两 Provider 的队训各有依据 |
| PS072 | Runcorn State High School | Ambiguous | Accepted | PC/100；E210/S119 完整地址，保留不可用日期 |
| PS075 | Sunnybank Hills State School | Ambiguous | Accepted | PC/100；E211/S141 club 注册资料完整地址 |
| PS076 | Centenary State High School | Accepted | Accepted | PC/100；P2-E022 证明 1 Moolanda 校址；Curragundi 才是 club 入口 |
| PS077 | Corinda State High School | Accepted | Accepted | PC/100；P2-E033 补 46 Pratten/4075；外括号名称严格等价 |
| PS078 | Manly State School | Ambiguous | Ambiguous | 17 candidates，无坐标；学校完整地址不自动选择候选 |
| PS079 | Wynnum State High School | Accepted | Accepted | 原 PC/97 精确行独立 alias/parcel 证明，全部原保护保留 |
| R2L-PS001 | St Oliver Plunkett School | Accepted | Accepted | PC/100；club 明确学校/U8 girls，R2L-E178 学校补完整地址 |
| R2L-PS002 | Mt Maria College Mitchelton | Ambiguous | Ambiguous | PC/99；54→54A 后缀变化，原 Group/Gaythorne 线索也需保留 |

其余 11 Ambiguous = 8 个无坐标 + PS044、PS046、R2L-PS002；唯一 Rejected 是 PS005。Confidence 100 不足以让 PS046 接受，是本方案保留安全边界的直接例证。

## 6. Seven Priority Sites Detailed Review

以下七项逐条检查均为 PC/100、合法数值及宽泛 QLD 地理范围内、street/number/locality/postcode/QLD FullAddress 一致、Comment 与 building label 均为空（无未知标签）、无 unresolved 地址冲突。仅 PS009 的末端 W/West、PS066 的 AV/Avenue 使用既有严格 token 格式处理。它们当前均有原 Site identity resolved 结构标识，唯一实际 blocker 为独立 owner identity binding 缺失。未对它们声称 cadastral footprint、学校授权、现场训练或入口认证。

| Site / club address | 现有来源与观察链 | 独立 owner evidence | Proposed 与残余限制 |
| --- | --- | --- | --- |
| PS003 / 11 Hamish Street, Calamvale 4116 | E160 / S023,S024,S119 / C023,C024,C120（2026-11-05）；R2L-E037/S035 也保留 club 地址。A003、A115、R2L-A002 分别有普通球队依据 | 未核实 | Accepted / campus-level。off Muirhead、School Access Rd 是入口说明；Cannons Term1 不升级本季，R2L-A002 保留 Unknown/manual review；另两关联保持原 Current |
| PS009 / 109 Weedon Street West, Mansfield 4122 | E186 / S050 / C050（2026-11-05）；S049/C049 官方父页直接嵌图，R2L-S076/S077 复核发布链。A011 BK Owls、A112 Hornets 独立证明训练 | 未核实 | Accepted / venue-level（property）。海报不是 owner 证据；也不证明 Dunkstar 在 Eagles 有普通 Team Training。BK Owls 保持 Unknown，不能套用 Hornets 队伍时效 |
| PS066 / 18 Parkway Avenue, South Ripley 4306 | E205 / S111 / C112（2026-11-05）；R2L-E185/S176 与 R2L-E189/S180（2026-11-06）复核 club 地址、RVSSC/Raptordome 关系 | 未核实 | Accepted / campus-level。Raptordome/Amare 区分；具体年龄组/周几陈述差异仍由 club 确认，不影响严格匹配该校园地址的地理结论 |
| PS070 / 312 Warrigal Road, Eight Mile Plains 4113 | E208 / S119 / C120（2026-11-05）；A118 的 R2L-E199/E200 / S190/S191（2026-11-06）保留 ordinary teams | 未核实 | Accepted / campus-level。只支持原表球队范围，不把 TrainingOnly 行或整体时间窗套给所有孩子 |
| PS071 / 590 Mains Road, Nathan 4111 | E209 / S119 / C120（2026-11-05）；A113 Hornets 的 E191/E192、A119 Rockets 的 E199/E200 为 R2L 独立训练依据 | 未核实 | Accepted / venue-level（property）。Hornets U16 girls 与 Rockets 队伍分开；原取消/换 court 限制不丢失 |
| PS072 / 132 Hill Road, Runcorn 4113 | E210 / S119 / C120（2026-11-05）；A120 的 R2L-E200/S191 复读完整表 | 未核实 | Accepted / campus-level。保留原临时不可用日期；不声称 stadium 门口或当前场地可入 |
| PS075 / 77 Symons Road, Sunnybank Hills 4109 | E211 / S141 / C142（2026-11-05）；R2L-E235/S225 与 E236/S226（2026-11-06）区分队训及其他产品 | 未核实 | Accepted / campus-level。U10+ 每周训练范围保留；ELITES、TrainingOnly、假期项目不混入，逐队时刻未公布 |

结论是 **7/7 有充分的既有离线证据支持本政策下的拟议接受**，而不是七项现在已经变更或本轮重新访问证实。完整原 HTML/PDF/海报字节通常未保存；本轮依据原已核读研究、观察及审查记录，不伪称原页面逐字复核。未来来源变化不由本轮离线审查排除。

## 7. Proposed Status Transition / Coverage

| 指标 | 当前 | 拟议 | 增量 |
| --- | --- | --- | --- |
| 全部 58 Sites: Accepted / Ambiguous / Rejected / Pending | 9 / 18 / 1 / 30 | 16 / 11 / 1 / 30 | +7 / −7 / 0 / 0 |
| 本批 28 行: Accepted / Ambiguous / Rejected | 9 / 18 / 1 | 16 / 11 / 1 | +7 / −7 / 0 |
| Site 覆盖率（58 分母） | 15.52% | 27.59% | +12.07 percentage points |
| 本批接受率（28 分母） | 32.14% | 57.14% | +25.00 percentage points |
| 有 Accepted 训练 Site 的 unique Providers（54 分母） | 9（16.67%） | 16（29.63%） | +7 |
| 有合格训练关联的 30 Providers 内覆盖率 | 30.00% | 53.33% | +23.33 percentage points |
| 关联到 Accepted Site 的 eligible Associations（70 分母） | 10（14.29%） | 21（30.00%） | +11 |
| 上述坐标覆盖中的 Current / Unknown Associations | 3 / 7 | 12 / 9 | +9 / +2；没有时效升级 |

唯一拟议状态变化 ID：**PS003、PS009、PS066、PS070、PS071、PS072、PS075**。

对应新增覆盖 Association：**A003、A011、A109、A112、A113、A115、A118、A119、A120、A131、R2L-A002**。新增覆盖七个 Provider：Algester Hawks、BK Owls、Cannons Southside、Ripley Valley、River City Hornets、Runcorn Rockets、Sunnybank Hills Hurricanes；它们此前均无 Accepted Training Site。共享地址按 Site 一点、关联按稳定 Association ID 统计，不能将 11 条关联误报为 11 个坐标。

以上均指内部地理信息覆盖，**不是**实际新发布的地图 Marker、确认仍训练的关系数、招生可用性或 Provider Address 覆盖率。Provider Address 54/25/19/29 和实际训练坐标数据完全不变。

### 30 Pending 与仍需研究的问题

- Tier C 13 项缺 postcode 等完整地址组件；Tier D 14 项缺地址；仅改政策不能补全，不能替用 Provider 注册地址。
- Tier E 的 PS059 保留 Mount Crosby/Karana Downs 冲突；R2L-PS003 保留 Badgen Road 2–34/2–36 冲突，仍需官方来源/人工裁定。
- Tier B PS047 的原 named/street 地址额外逗号不适用于既定安全 unquoted CSV；不能静默删名或造门牌。本轮不改导出格式、不提交新批次。
- 8 个无坐标政府结果仍需另行调查候选/解析问题及取得可靠选定结果；PS044/046 需针对范围及 label 核对，R2L-PS002 需 54/54A 和历史 locality 解释，PS005 需 Lindum/Wynnum West 的专属官方地址链。不能复用 PS079 例外。
- 七个优先场地没有剩余必需的第二 owner 研究任务，但如今后出现实际冲突必须重新进入复核。现场使用权、具体入口、精确球馆与实时训练由俱乐部确认；未来 UI/数据发布的 scope/disclosure review 尚未完成。

## 8. Proposed Data Model and Parent Presentation

建议复用现有分层，**无需新增面向产品的 `venueOwnerVerification` 状态机或改变 slim contract**：

| 概念 | 现有位置 | 拟议处理 |
| --- | --- | --- |
| Association 的官方训练证据 | raw evidence/sources + eligible-associations.evidenceIds / scopeReference | 保留，不从地址页推训练 |
| 训练时效与球队范围 | temporalClassification、asOfDate、activityScope、teamAgeScope、manual/disclosure review、limitations | 原样保留，按关联展示 |
| 坐标接受 | venue-geocoding-results.status / candidateCoordinates / acceptedCoordinates | 政策调整只改变充分地址证据的判断 |
| 定位精度 | precision: campus-level / venue-level | 继续表示校园/场馆 property，不是 hall/入口；小数位不等于精度 |
| 补充独立地址证明 | inventory/result.identityEvidence / sameSiteAlias | 原证明保留，按其实际作用使用，absence 不等于 Conflict |

建议最小内部增量：在新 validator helper 输出一个衍生地址证明记录，例如 `trainingAddressEvidence`，带 `sourceRole`（club-published-address / official-site-supplement）、Site/Venue、canonical address、Source/Evidence/observation 引用、原 checked date、hash、limitation。它不由用户手填 boolean 授权，不进入 slim 前端投影；可与现有 identityEvidence 并存。这样七条不被错误写成 `direct-official-site-address`（owner 已核验）。若可以在已有内部 proof 字段中安全表达这些角色，可复用；不要把“无 owner 证明”写成“owner 已验证”。

`venueOwnerVerification: NotChecked | Verified | Conflict` 可由内部证据推导，尚无公开产品用途；现在持久化会新增同步/兼容性负担，还容易将 Verified 理解为认证使用权。本文矩阵中的 owner status 只是审查维度，不是新增生产字段。若未来 UI 确需此维度，再审批其严格含义和迁移。仅调整 validator 代码中的尾部 if 而不补来源证明与审计角色也不充分。

建议家长文案（本轮不改网站）：

> 训练场地信息来自俱乐部或其主管协会的官方资料。地图按已核对的地址定位；具体球队、训练时间和场地安排请向俱乐部确认。

学校/大型场地附一句：“地图点表示校园或场馆范围，不代表球馆入口。” Current Confirmed 展示“研究时确认（截至 2026-11-06，仅限所列球队/赛季）”；Official Listed 展示“官方列出，当前训练安排未确认”。共享 Site 必须对每个 Provider/Association 分别显示时效；不以任何一个 Current 标签覆盖全部关系。未知时效、manual/disclosure review 不能被隐藏在 Accepted 标签后；未定位场地仍可在未来已批准列表中作准确的无坐标参考。

## 9. Proposed Code Change List（尚未批准执行）

| 文件 / 函数或产物 | 预计最小修改 |
| --- | --- |
| `scripts/training-venues/prepare.mjs` | 增加/接入 `trainingAddressEvidence(site, context)` 或等价 helper，核完整官方地址/补全链，保留 eligible / validateInputs / conflicts / 原研究 / IDs；原 identityEvidence 继续提供必要补充证明 |
| 可选新 `scripts/training-venues/reviewed-training-address-bindings.mjs` | 七条经审查 club-address 绑定，包含地址组件、发布链及原 source/evidence/observation hash；避免扩大原 direct-owner registry 的语义。简单声明式表即可，不重构数据流水线 |
| `scripts/training-venues/validate.mjs::validateVenueResultWithPolicy()` | 以闭合官方训练地址链替代普遍 owner-proof gate；调整 reason 文案/内部审计 basis。硬性地址、坐标、building、冲突、strictAddressOutcome、alias 顺序保留 |
| `scripts/training-venues/reviewed-identity-bindings.mjs` | 预计不改原三条绑定；审查 integration 和消失/篡改补全证据仍失败，不能用新政策掩盖补全链缺失 |
| `aliases.mjs`、`alias-chain.mjs`、`ps079-alias-binding.mjs` | 预计零代码改动；必须保留全部生产专属绑定和 negative regression |
| `scripts/prepare-training-venues.mjs` | 预计无 CLI/路径/写入逻辑改动；不得新增无证据批准开关。必要时仅随内部 proof 字段序列化，不扩输出目标 |
| `scripts/training-venues/contract.d.ts` / `candidatesFor()` | 预计保持当前 slim schema/投影；内部新增审计字段不下传。若真正改变 public contract 则另报 Owner，不顺带实施 |
| `tests/training-venues.test.mjs` | 新地址证据正反例、来源发布主体链、活动资格/时效隔离、private allowlist 保护；保留原 54/70/58 与 Provider Address 检查 |
| `tests/training-venues-identity.test.mjs` | 调整原“七条仅因缺 owner proof 必须 Ambiguous”预期；加入缺 club 地址/错 site/篡改 source chain 仍不能接受；保留三条旧适配器真实证明测试 |
| `tests/training-venues-aliases.test.mjs` | 真实批次汇总拟改 16/11/1/30；原值448 cells、8无坐标、30Pending、PS079 mutation、suffix/range/type/precision负测继续保持 |
| benchmark README + 新实施任务文档 | 批准后写新政策和实施结果；本轮不覆盖 README/历史任务结论 |
| 内部 `venue-inventory.json`、`venue-geocoding-results.json`、`training-venue-candidates.json` | 经授权正式重生成，前两类保留 proof/新理由，七条坐标/precision 才可进入 candidates；其余9Accepted/12非接受/30Pending的坐标结论不变，审计元数据变动单列 |
| 内部 `eligible-associations.json`、`addresses.csv`、`address-mapping.json`、`address-preparation-results.json` | 不应出现语义或字节变化；正式全七文件 check 与原输入/映射同一性必须验证 |

不得修改共享 Provider Address validator `scripts/qld-geocoder/compare.mjs`、Provider Address 结果、React/地图/搜索、公开数据或原研究。未来一次实施应把既有九条、七条拟变更、其余 42 条分别冻结比较，不通过修改 CSV/研究输入/hash 或移除负测满足目标数量。

## 10. Proposed QA and Regression Test Plan

实施阶段须另获 Owner 明确批准。Developer 实施自检 → 实际独立 QA → 必要修复/回归（最多三轮）；UI 无变更时 UAT Not Applicable。预先固定以下预期：

| 场景 | 必须观察到的结果 |
| --- | --- |
| 真实官方 club 完整地址 + 合格周训 + 精确 PC/100 | 可 Accepted；无 owner 资料仍不冒称 owner Verified；七条真实结果可复现 |
| 只有 club 场馆名称，无足够地址链 | Ambiguous / 无 acceptedCoordinates；同名邻近学校、Provider 地址或 PC/100 不得补缺 |
| club 部分地址 + 经审查学校/运营方补全 | 正向保持现九条；删除/篡改实际补全组件后不能继续接受，不按旧 Accepted grandfather |
| CDN/Group URL 看似官方但无发布链，wrong Provider/venue/evidence 或修改 observation/hash | 拒绝授予地址/关系证明；官方域名和 boolean 单独无效 |
| 主管协会直接明确该俱乐部普通训练场地 vs 仅 membership、比赛/社区目录 | 按 Owner 批准的来源定义保留前者及原 Unknown 时效；后者不授予 weekly training 资格 |
| PS009 地址海报提 Eagles，但没有 Dunkstar 普通 Eagles team row | 地址可复用；eligible Associations 仍70，不新增 Dunkstar→Eagles |
| 错门牌、方向、suburb/postcode/state 或校园 | 继续 Rejected；字母后缀/unit/range 等未解决 review 不 Accepted；PS005 仍 Rejected，R2L-PS002 仍 Ambiguous |
| PS044/PS046 范围/未知 building label | 保持 Ambiguous；不能用 club source 或 exact normalized name 伪造已核 alias |
| 政府多候选/解析失败、无坐标、缺一个坐标、非法数值、QLD 外点 | 不 Accepted；真实8条无坐标仍无点，不能取第一/最近候选 |
| 非 PC、road/locality midpoint、confidence99/98、非空Comment、FullAddress不一致 | 自动接受被阻止；确定错误精度拒绝，其他维持应有 review；Confidence100不能覆盖错误 |
| AV/Avenue、W/West 格式等价和外括号 building wrapper | 合法格式保持；组合错误locality/postcode/state/suffix/units/range仍保留全部其他诊断及拒绝优先级 |
| 活动不合格、仅比赛/一次性/假期/casual/一般篮球 | 不增加 training association，不凭地址页创造训练用途 |
| Official Listed — Current Status Unknown、manual/disclosure review、球队例外 | 坐标接受不改 temporal/scope/asOf/limitations；原32/38整体不变，新增覆盖含2个Unknown |
| PS079 真实行及篡改任一字段/证据/parcel/CRS、点在外/洞/边界 | 原精确PC97接受且97原样；变更不能继承裁定；其他Site不能用该例外；原六份proof完整 |
| genuine receipt/schema/InputIndex/echo/hash 错误、乱序、缺/重复行 | 合法乱序按index保持，错误 fail closed；原CSV28行/448 cells完全保留 |
| 54/70/58、Site共享、既有Provider Address54/25/19/29 | 全部保持；新覆盖按 unique Provider/Association/Site分别统计；30Pending不变 |
| 私有研究/新增内部proof/FB链接与公开投影 | Git ignore、frontend imports、allowlist和构建产物检查通过；不得把 raw prose、scope细节、内部URL/政府元数据散入前端 |
| CLI/output safety、无结果误覆盖、重复生成 | 原输出白名单、symlink、防Pending覆盖继续；正式重复导入/全七文件check确定性；保留真实来源日期 |

后续批准实施时，使用现有 `npm test`、`npm run check`、`npm run lint`、`npm run build`、`git diff --check` 和真实 CSV/provenance/date 的正式生成/全七文件 `--check`，先审查 side effects 并把所需缓存/temp 限定项目。原精确输入及 alias 证据不变，不重传政府 CSV。本轮这些软件测试/正式导入 **Not Executed（不在只审查任务范围）**，未来实现结果 **Not Verified**。

## 11. Independent QA Review of the Proposed Policy

**独立自定义 QA 结论：Pass（政策审查、离线重评及实施方案范围），同意提交 Owner 审批；无阻断缺陷。** Main 已直接读取 `qa/final-review.md`，核对独立证据和实际审查版本。QA 不修改生产实现或验收标准。

| 本轮检查 | 结果 / 证据 |
| --- | --- |
| 现有代码门槛、政策一致性、PS079 边界 | Pass；`qa/final-review.md` / `qa/independent-findings.md` |
| 全部28行、448个 canonical government 字段、3份研究与CSV hash | Pass；Main `input-integrity-audit.json`、QA `independent-data-audit.json`；双方分别执行离线检查，退出0 |
| 完整矩阵、来源投影及覆盖 | Pass；QA 独立核对14组必需字段、106份Evidence及125份Source投影和原记录；7条拟变更、其余21条状态与覆盖数一致 |
| 原文件保护 | Pass；Main冻结108份文件的hash/size/mtime无变化，QA独立重算该108份及其另冻77份hash，零漂移；Provider Address静态数据重核54/25/19/29 |
| 文档/证据边界 | Pass；仅新增指定文档及ignored证据；`git diff --check`退出0，新文档因untracked另行检查空白；无原实现/测试/数据修改 |
| 未来实施、运行时正反例/回归 | Not Verified；未授权实施，本轮未运行npm测试/构建/正式导入 |
| 当前线上时效、原完整HTML/PDF/海报字节重新核读 | Not Verified；按原研究日期/观察和既有证明审查 |
| 浏览器UAT及关闭收尾 | Not Applicable；未建立浏览器/服务器会话 |

`qa/reviewed-version.json` 冻结所审草案、完整矩阵和汇总；`final-evidence-manifest.json` 冻结最终交付文件。QA 的两项非阻断建议已采纳：明确七条 Comment/building label 均为空，补充主管协会直接关系与membership/比赛目录的正反场景；无规则、分类或计数变更。这里的**政策QA Pass不能替代未来实施Pass**。

## 12. Completion Handoff / Owner Decisions

1. **现 Accepted 规则是否过严？** 是：完整官方 club 地址已经严格定位且无身份疑点，仍一律要求 owner 独立第二来源。七条仅因此被挡住。不是所有 identity evidence 都多余，现有补全/别名链仍必要。
2. **必须保留哪些保护？** 官方普通周训资格与闭合地址链、稳定Site、精确政府批次关系、门牌/后缀/方向/locality/postcode/州、坐标/PC/Confidence/FullAddress/Comment、校园冲突、范围/多候选、别名专属证明、时效/球队限制和隐私隔离。
3. **七条多少可充分支持？** 本轮离线资料下 **7/7**；五处 campus-level，两处 Eagles/Nissan venue/property-level，无 hall/entry/实时使用保证。
4. **28条新旧变化？** 9/18/1 → **拟议16/11/1**，只变 PS003/009/066/070/071/072/075；另30Pending不变。实际仍9/18/1/30。
5. **有效坐标覆盖增加多少？** 拟增7 Sites、7独立Providers、11既有eligible Associations（9 Current标签、2 Unknown标签，标签本身未变）。Provider Address 与公开地图无变化。
6. **是否需要改结构？** 无需新增公开owner状态或改slim contract；需要validator与可追溯的内部地址证明/helper，避免只删gate。原字段可表达则复用，必要的内部proof增量随实施评审。
7. **哪些仍需核查？** 8无坐标、PS044/046、R2L-PS002、PS005及30Pending各自实质问题；官方补全链不足时仍需人工/官方来源。未新验证的实时安排、owner使用许可、具体馆/入口与原页面字节不作承诺。
8. **下一阶段改哪些文件？** 第9节列明 prepare/validate、可选训练地址binding模块、三组训练测试、内部三类生成产物及README/新实施记录；alias与Provider Address模块默认不改。
9. **QA是否同意？** 同意；独立政策审查 **Pass，无阻断缺陷**。全部28行、来源链、边界、覆盖及原文件保护均已核对，实施与未来回归仍Not Verified。
10. **Owner必须批准什么？** 新政策及其两条地址证据路径、主管协会明确发布关系的来源定义、七条拟议升级与精度、内部审计方式、下一阶段代码/测试/数据重生成范围。任何新外网研究、API/上传、UI集成、公开发布、commit/push/部署均未被本轮或本方案自动授权。

## Implementation Result（本轮审查，非政策实施）

已完成现政策审计、拟议规则、28条逐行重评、七条深审、覆盖影响、模型/UI建议及代码/回归方案；只新增本任务文档与 ignored 证据。独立政策 QA **Pass**，原108份受保护文件及实际9/18/1/30、Provider Address54/25/19/29不变；无产品修复轮次。主交付及九类证据索引见证据根目录 `README.md`，原文件保护见 `final-scope-audit.json`。**审查已完成；政策未实施。停止，等待 Owner 决策，不自动进入下一阶段。**
