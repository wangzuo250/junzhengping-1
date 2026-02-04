#!/bin/bash

# 手动部署脚本 - 部署到腾讯云服务器
# 使用方法：在本地电脑上运行此脚本

set -e

# 配置信息
SERVER_HOST="106.54.161.236"
SERVER_USER="root"
SERVER_PASSWORD="Manus@2026"
DEPLOY_DIR="/root/topic-report-system"
APP_NAME="topic-report-system"

echo "========================================="
echo "开始部署 Jun正坪工作室选题系统"
echo "========================================="

# 1. 打包项目（排除不需要的文件）
echo "📦 正在打包项目..."
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='.manus-logs' \
    --exclude='screenshots' \
    --exclude='page_texts' \
    -czf /tmp/project.tar.gz .

echo "✅ 项目打包完成"

# 2. 上传到服务器
echo "📤 正在上传到服务器..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no \
    /tmp/project.tar.gz $SERVER_USER@$SERVER_HOST:/tmp/

echo "✅ 上传完成"

# 3. 在服务器上部署
echo "🚀 正在服务器上部署..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no \
    $SERVER_USER@$SERVER_HOST << 'ENDSSH'

# 创建部署目录
mkdir -p /root/topic-report-system
cd /root/topic-report-system

# 解压项目
echo "📂 正在解压项目..."
tar -xzf /tmp/project.tar.gz
rm /tmp/project.tar.gz

# 创建环境变量文件
echo "⚙️  正在配置环境变量..."
cat > .env << 'EOF'
# 数据库配置
DATABASE_URL=mysql://root:Manus@2026@localhost:3306/topic_report_system

# JWT 密钥
JWT_SECRET=XXNwo79qjNSpQ8dzuetXPS

# Manus OAuth 配置
VITE_APP_ID=g5LX4x79UdX68RxpKYLQF9
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im

# 所有者信息
OWNER_OPEN_ID=LMBWJL8UUkwQiLcZHAbmRE
OWNER_NAME=wangzuo250

# Manus 内置 API
BUILT_IN_FORGE_API_URL=https://forge.manus.ai
BUILT_IN_FORGE_API_KEY=UKmuYX2chzteiZXV7v53Cf
VITE_FRONTEND_FORGE_API_KEY=gcgJqAUGLZwqbujh4Bcv95
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.ai

# 分析统计
VITE_ANALYTICS_ENDPOINT=https://manus-analytics.com
VITE_ANALYTICS_WEBSITE_ID=3d548452-32b4-442e-9991-346dcc0d251a

# 应用配置
VITE_APP_LOGO=https://files.manuscdn.com/user_upload_by_module/web_dev_logo/310519663327375198/eWGwizLmOwOtwVAw.png
VITE_APP_TITLE=Jun正坪工作室选题系统

# Node 环境
NODE_ENV=production
EOF

# 安装依赖
echo "📥 正在安装依赖..."
npm install --production=false

# 构建项目
echo "🔨 正在构建项目..."
npm run build

# 运行数据库迁移
echo "🗄️  正在运行数据库迁移..."
npm run db:push

# 停止旧进程（如果存在）
echo "🛑 正在停止旧进程..."
pm2 stop topic-report-system || true
pm2 delete topic-report-system || true

# 启动新进程
echo "▶️  正在启动应用..."
pm2 start npm --name "topic-report-system" -- run start
pm2 save

echo "✅ 部署完成！"
echo "访问地址：http://106.54.161.236:3000"

ENDSSH

echo "========================================="
echo "✅ 部署成功！"
echo "访问地址：http://106.54.161.236:3000"
echo "========================================="
