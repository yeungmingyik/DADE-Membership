# DADE Membership

新加坡多门店会员服务平台 · Membership services for stores in Singapore

**版本 / Version:** 0.2.1

**阶段 / Stage:** 应用基础与数据查询 / Application foundation and data access

## 当前功能 / Capabilities

| 使用端 / Surface | 功能 / Capabilities |
| --- | --- |
| 会员 / Members | 数字会员卡、会员码、积分与等级、礼品目录、活动记录、账户 / Digital card, membership code, points and tier, reward catalogue, activity and account |
| 门店 / Stores | 门店概览、会员检索、会员详情、活动记录 / Store overview, member search, member details and activity |
| 总部 / Head office | 业务概览、会员、门店、员工与活动记录 / Overview, members, stores, staff and activity |

当前版本提供查询界面与服务基础。真实短信验证、账号开通、员工认证及 MFA、消费记账、兑换、退款、运营配置、回访分析和报表导出尚未交付；登录提交返回服务暂不可用，不签发会话。初始数据库不包含账户或演示数据。

This version provides data views and service foundations. SMS verification, account provisioning, staff authentication and MFA, purchase posting, redemption, refunds, operational settings, visit analysis and report exports are not yet available. Login requests return service unavailable and do not issue sessions. A new database contains no accounts or demo data.

## 产品标准 / Product standards

- English 与简体中文 / English and Simplified Chinese.
- 暖白、石灰灰与炭黑主题，适配手机、平板和桌面 / Warm white, stone and charcoal theme for mobile, tablet and desktop.
- 手机号码表单默认新加坡 +65，支持国际区号及 E.164 校验 / Singapore +65 by default, international calling codes and E.164 validation.
- 金额采用 SGD，业务时区为 Asia/Singapore / SGD amounts and Asia/Singapore business time.
- 三端独立入口、服务端会话与门店范围校验 / Separate surfaces with server-side session and store-scope checks.
- 本地 SQLite 持久化、显式迁移、限量查询和汇总投影 / Local SQLite persistence, explicit migrations, bounded queries and aggregate projections.

## 运行 / Run

Node.js 24 LTS · npm 11 · SQLite ≥ 3.51.3

```sh
npm ci
npm run db:migrate
npm run build
npm run start:member
```

| 命令 / Command | 入口 / Surface | 默认地址 / Default address |
| --- | --- | --- |
| `npm run start:member` | 会员 / Member | `127.0.0.1:3100` |
| `npm run start:staff` | 员工 / Staff | `127.0.0.1:3101` |
| `npm run start:admin` | 总部 / Head office | `127.0.0.1:3102` |

| 环境变量 / Environment | 默认值 / Default |
| --- | --- |
| `DATABASE_PATH` | `.local/dade.sqlite` |
| `APP_HOST` | `127.0.0.1` |
| `APP_PORT` | 使用端对应端口 / Surface port |
| `APP_ORIGIN` | 直连请求地址；反向代理部署时设为该端公开 HTTPS Origin / Direct request origin; set the surface's public HTTPS origin behind a reverse proxy |

三端连接同一数据库。构建产物位于 `.next/standalone`，包含静态资源与本地字体。独立部署时设置 `APP_SURFACE`、`DATABASE_PATH`、`HOSTNAME`、`PORT`，执行 `node server.js`；数据库路径应为持久卷中的绝对路径。

All surfaces share one database. `.next/standalone` includes static assets and local fonts. For standalone deployment, set `APP_SURFACE`, `DATABASE_PATH`, `HOSTNAME` and `PORT`, then run `node server.js`; use an absolute database path on persistent storage.

## 验证 / Validation

```sh
npm run lint
npm test
npm run build
npm run typecheck
npm run test:runtime
npm run check:release
```

测试使用独立合成数据。服务器容量需在目标环境完成压测后确认。

Tests use isolated synthetic data. Server capacity requires validation on the target infrastructure.

## 技术栈 / Stack

Next.js · React · TypeScript · Tailwind CSS · shadcn/ui · SQLite

## 版本记录 / Releases

[更新日志 / Changelog](CHANGELOG.json) · [当前版本 / Current version](VERSION)

## 维护 / Maintainer

[yeungmingyik](https://github.com/yeungmingyik)

保留所有权利。第三方组件遵循各自许可。 / All rights reserved. Third-party components retain their respective licences.
