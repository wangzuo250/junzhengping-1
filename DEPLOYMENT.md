# 腾讯云自动部署指南

本项目已配置 GitHub Actions 自动部署到腾讯云服务器。

## 服务器信息

- **IP**: 106.54.161.236
- **系统**: OpenCloudOS 9 (2核2G5M)
- **Node.js**: v22.13.0
- **MySQL**: 8.0.44
- **域名**: wangzuo250.cn（备案中）

## 快速开始

### 1. 配置 GitHub Secrets

在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加以下 Secrets：

**服务器连接（3个）：**
- `SERVER_HOST` = `106.54.161.236`
- `SERVER_USER` = `root`  
- `SERVER_PASSWORD` = `Manus@2026`

**数据库（1个）：**
- `DB_PASSWORD` = `Manus@2026`

**应用环境变量（14个）** - 从 Manus 项目复制：
- `JWT_SECRET`
- `VITE_APP_ID`
- `OAUTH_SERVER_URL`
- `VITE_OAUTH_PORTAL_URL`
- `OWNER_OPEN_ID`
- `OWNER_NAME`
- `BUILT_IN_FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY`
- `VITE_FRONTEND_FORGE_API_KEY`
- `VITE_FRONTEND_FORGE_API_URL`
- `VITE_ANALYTICS_ENDPOINT`
- `VITE_ANALYTICS_WEBSITE_ID`
- `VITE_APP_LOGO`
- `VITE_APP_TITLE`

### 2. 初始化服务器

SSH 登录服务器后执行：

```bash
# 安装 PM2
npm install -g pm2
pm2 startup

# 创建数据库
mysql -u root -p
CREATE DATABASE topic_report_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# 安装 Nginx（可选）
yum install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 3. 触发部署

推送代码到 main 分支：

```bash
git push origin main
```

或在 GitHub Actions 页面手动触发。

## 部署流程

1. 代码推送到 main 分支
2. GitHub Actions 自动构建
3. 打包上传到服务器
4. 安装依赖并运行迁移
5. PM2 重启应用

## 常用命令

```bash
# 查看应用状态
pm2 status
pm2 logs topic-report-system

# 重启应用
pm2 restart topic-report-system

# 停止应用
pm2 stop topic-report-system
```

## 访问应用

- 直接访问：http://106.54.161.236:3000
- 域名访问：http://wangzuo250.cn（备案通过后）

## 故障排查

```bash
# 查看日志
pm2 logs topic-report-system --lines 100

# 检查端口
netstat -tlnp | grep 3000

# 检查数据库
mysql -u root -p -e "SHOW DATABASES"
```
