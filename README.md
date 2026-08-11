# OpsMobile — 手机端应用中心

轻量 H5（Vue 3 + Vant），公网路径 `/apps/ops-m/`。仅 Web，无独立 API；调用 Order / Self / Shipping 的 Admin API，鉴权复用 Cookie SSO。

仓库：[OnlineStoreMS/OpsMobile](https://github.com/OnlineStoreMS/OpsMobile)

## 功能

- 新建手工单（打单方式默认自建物流；真打单在电脑发货中心）
- 自营订单查询
- 发货中心待发货 / 已发货查询

## 本地开发

```bash
cd web && npm install && npm run dev
# http://localhost:5190/apps/ops-m/
```

Vite 已代理 `/iam`、`/apps/{order,self,shipping}/api` 到本机各 Core API。

## Docker / ACR

| 镜像 | Dockerfile |
|------|-----------|
| `opsmobile-web` | [`docker/Dockerfile.web`](docker/Dockerfile.web) |

GitHub Actions：推送 `main` / `dev_yeyazhou` 或手动触发 [`.github/workflows/docker-push-acr.yml`](.github/workflows/docker-push-acr.yml)，推送到阿里云 ACR（组织 Secrets：`ALIYUN_ACR_*`）。

服务器（deploy 仓库）：

```bash
make sync-configs
make up-images   # 或 docker compose -f docker-compose.yml -f docker-compose.acr.yml up -d opsmobile-web
```

路径：`https://{OSMS_BASE_DOMAIN}/apps/ops-m/`；UserCore 应用中心注册码 `opsmobile`。

详见 deploy 仓库 [docs/GITHUB_ACR.md](https://github.com/OnlineStoreMS/deploy/blob/main/docs/GITHUB_ACR.md)。
