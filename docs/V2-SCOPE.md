# Youth Sports Finder — Basketball V2 Scope

## Goal

帮助澳大利亚家长找到附近的 Association-affiliated Basketball Clubs，以及普通球队的日常训练场地。
采用 Fast Delivery + Repeatable Automation + Practical Data Quality，先打通真实数据流程，再扩展覆盖。

## Core Pipeline

`State Associations → Affiliated Clubs → Regular Training Venues → Training Addresses → G-NAF Coordinates → Static JSON/GeoJSON → Map`

## In Scope

- 官方 Basketball Associations 与有明确关联证据的 Affiliated Clubs。
- 有公开来源支持的青少年项目与 Regular Training Venues，及其 Training Addresses。
- G-NAF Offline Geocoding，本地数据处理与可复用缓存/索引。
- Basketball Hall、School/Campus-level、Property-level Coordinates，正确表达精度。
- Static Search and Map，复用 React、TypeScript、Vite、MapLibre。
- 未来 Cloudflare Pages Free 静态部署，发布前另获 Owner 授权。
- 批量处理、增量更新、重复运行和独立 Review Queue。

## Out of Scope

- 其他运动。
- 非 Association 关联 Clubs 的主动调查。
- 精确球馆入口测绘。
- 复杂时间表。
- 用户账户。
- 后端数据库。
- 付费基础设施。

比赛场地、假期 Camp、一次性活动或办公地址不能自动当成普通球队训练场地。
不继承 V1 Queensland Geocoder PC/100 或多阶段地理编码审批要求。
保留基本真实性、来源追踪、地址一致性、坐标精度及隐私/许可检查。

## MVP Success Criteria

从一个真实 Association 自动发现其 Clubs，提取有公开来源支持的常规训练地点，
完成可接受的坐标匹配，生成静态 JSON/GeoJSON，并在现有地图上展示。

- 能追溯 Association affiliation、青少年适用性、Club–Venue 关系与地址来源。
- 明确标记 Hall、School/Campus 或 Property 级精度，不声称入口级精确定位。
- 支持重复运行、缓存复用和异常记录输出；冲突/缺失进入 Review Queue，不阻塞其他明确记录。
- 无可靠训练关系或未解决定位的记录不作为已定位训练场地 Marker 展示。
- 用真实样本和基本数据 QA 验证，不能以模拟数据声称 MVP 完成。

扩展顺序：**一个 Association → Greater Brisbane → QLD → 逐州扩展全国**。

## Current Status

已在 Owner 批准的 SWM Pirates MVP 任务中实现首条 Association-first Pipeline，并接入现有 React/MapLibre。
2026-11-14 实测发现 8 家 Clubs、3 家具有确认训练关系、8 个独立训练场地；2 个官方校园 fallback 点上图。
本地没有可用真实 G-NAF 数据，G-NAF 实测仍为 Not Verified；当前交付为 Partial Pass。
详情见 [SWM MVP Result](SWM-PIRATES-MVP-RESULT.md)。本范围文档不授权后续 Association 扩展、数据下载或部署。
