# 手动部署指南

本指南将帮助您手动将项目部署到腾讯云服务器。

## 前提条件

1. **本地环境要求**：
   - 已安装 `sshpass`（用于自动化 SSH 密码输入）
   - 已安装 `ssh` 和 `scp` 命令
   - 有权限执行 shell 脚本

2. **服务器已完成初始化**：
   - ✅ Node.js v22.13.0
   - ✅ PM2 v6.0.14
   - ✅ MySQL 8.0.44
   - ✅ 数据库 `topic_report_system` 已创建

## 方法一：使用自动化脚本（推荐）

### 1. 安装 sshpass（如果未安装）

**macOS**:
```bash
brew install hudochenkov/sshpass/sshpass
```

**Ubuntu/Debian**:
```bash
sudo apt-get install sshpass
```

**CentOS/RHEL**:
```bash
sudo yum install sshpass
```

### 2. 下载项目代码

```bash
# 克隆项目
git clone https://github.com/wangzuo250/junzhengping-1.git
cd junzhengping-1
```

### 3. 运行部署脚本

```bash
# 添加执行权限
chmod +x scripts/manual-deploy.sh

# 运行部署
./scripts/manual-deploy.sh
```

脚本会自动完成以下步骤：
1. 📦 打包项目文件
2. 📤 上传到服务器
3. 📂 解压并配置环境变量
4. 📥 安装依赖
5. 🔨 构建项目
6. 🗄️ 运行数据库迁移
7. ▶️ 启动应用

### 4. 验证部署

部署完成后，访问：http://106.54.161.236:3000

---

## 方法二：手动逐步部署

如果自动化脚本无法运行，可以按照以下步骤手动部署。

### 1. 打包项目

在本地项目目录中：

```bash
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='.manus-logs' \
    -czf project.tar.gz .
```

### 2. 上传到服务器

```bash
scp project.tar.gz root@106.54.161.236:/tmp/
```

密码：`Manus@2026`

### 3. SSH 登录到服务器

```bash
ssh root@106.54.161.236
```

密码：`Manus@2026`

### 4. 解压项目

```bash
mkdir -p /root/topic-report-system
cd /root/topic-report-system
tar -xzf /tmp/project.tar.gz
rm /tmp/project.tar.gz
```

### 5. 创建环境变量文件

```bash
cat > .env << 'EOF'
DATABASE_URL=mysql://root:Manus@2026@localhost:3306/topic_report_system
JWT_SECRET=XXNwo79qjNSpQ8dzuetXPS
VITE_APP_ID=g5LX4x79UdX68RxpKYLQF9
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im
OWNER_OPEN_ID=LMBWJL8UUkwQiLcZHAbmRE
OWNER_NAME=wangzuo250
BUILT_IN_FORGE_API_URL=https://forge.manus.ai
BUILT_IN_FORGE_API_KEY=UKmuYX2chzteiZXV7v53Cf
VITE_FRONTEND_FORGE_API_KEY=gcgJqAUGLZwqbujh4Bcv95
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.ai
VITE_ANALYTICS_ENDPOINT=https://manus-analytics.com
VITE_ANALYTICS_WEBSITE_ID=3d548452-32b4-442e-9991-346dcc0d251a
VITE_APP_LOGO=https://files.manuscdn.com/user_upload_by_module/web_dev_logo/310519663327375198/eWGwizLmOwOtwVAw.png
VITE_APP_TITLE=Jun正坪工作室选题系统
NODE_ENV=production
EOF
```

### 6. 安装依赖

```bash
npm install --production=false
```

### 7. 构建项目

```bash
npm run build
```

### 8. 运行数据库迁移

```bash
npm run db:push
```

### 9. 启动应用

```bash
# 停止旧进程（如果存在）
pm2 stop topic-report-system || true
pm2 delete topic-report-system || true

# 启动新进程
pm2 start npm --name "topic-report-system" -- run start

# 保存 PM2 配置
pm2 save
```

### 10. 验证部署

```bash
# 查看应用状态
pm2 status

# 查看应用日志
pm2 logs topic-report-system
```

访问：http://106.54.161.236:3000

---

## 常用命令

### 查看应用状态
```bash
pm2 status
```

### 查看应用日志
```bash
pm2 logs topic-report-system
```

### 重启应用
```bash
pm2 restart topic-report-system
```

### 停止应用
```bash
pm2 stop topic-report-system
```

### 查看数据库
```bash
mysql -u root -p'Manus@2026' -e "USE topic_report_system; SHOW TABLES;"
```

---

## 故障排查

### 1. 应用无法启动

查看错误日志：
```bash
pm2 logs topic-report-system --err
```

### 2. 数据库连接失败

检查 MySQL 服务：
```bash
systemctl status mysqld
```

检查数据库是否存在：
```bash
mysql -u root -p'Manus@2026' -e "SHOW DATABASES LIKE 'topic_report_system';"
```

### 3. 端口被占用

检查端口占用：
```bash
netstat -tlnp | grep 3000
```

杀死占用进程：
```bash
kill -9 <PID>
```

### 4. 权限问题

确保文件权限正确：
```bash
chown -R root:root /root/topic-report-system
chmod -R 755 /root/topic-report-system
```

---

## 更新部署

当代码更新后，重新运行部署脚本即可：

```bash
./scripts/manual-deploy.sh
```

或者手动执行步骤 1-9。

---

## 域名配置（可选）

域名备案通过后，配置 Nginx 反向代理：

### 1. 安装 Nginx

```bash
yum install nginx -y
systemctl start nginx
systemctl enable nginx
```

### 2. 配置 Nginx

```bash
cat > /etc/nginx/conf.d/topic-report-system.conf << 'EOF'
server {
    listen 80;
    server_name wangzuo250.cn www.wangzuo250.cn;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

### 3. 重启 Nginx

```bash
nginx -t
systemctl reload nginx
```

### 4. 配置 SSL（可选）

使用 Let's Encrypt 免费 SSL 证书：

```bash
# 安装 certbot
yum install certbot python3-certbot-nginx -y

# 获取证书
certbot --nginx -d wangzuo250.cn -d www.wangzuo250.cn

# 自动续期
certbot renew --dry-run
```

---

## 联系信息

- **服务器 IP**: 106.54.161.236
- **SSH 用户**: root
- **应用端口**: 3000
- **域名**: wangzuo250.cn（备案中）
