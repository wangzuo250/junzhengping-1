#!/bin/bash

# GitHub Secrets 自动配置脚本
# 使用方法：在本地电脑上运行此脚本（需要先安装 gh CLI 并登录）

REPO="wangzuo250/junzhengping-1"

echo "开始配置 GitHub Secrets..."
echo "仓库: $REPO"
echo ""

# 服务器连接信息
echo "1/18 配置 SERVER_HOST..."
gh secret set SERVER_HOST -b"106.54.161.236" -R $REPO

echo "2/18 配置 SERVER_USER..."
gh secret set SERVER_USER -b"root" -R $REPO

echo "3/18 配置 SERVER_PASSWORD..."
gh secret set SERVER_PASSWORD -b"Manus@2026" -R $REPO

# 数据库信息
echo "4/18 配置 DB_PASSWORD..."
gh secret set DB_PASSWORD -b"Manus@2026" -R $REPO

# 应用环境变量
echo "5/18 配置 JWT_SECRET..."
gh secret set JWT_SECRET -b"XXNwo79qjNSpQ8dzuetXPS" -R $REPO

echo "6/18 配置 VITE_APP_ID..."
gh secret set VITE_APP_ID -b"g5LX4x79UdX68RxpKYLQF9" -R $REPO

echo "7/18 配置 OAUTH_SERVER_URL..."
gh secret set OAUTH_SERVER_URL -b"https://api.manus.im" -R $REPO

echo "8/18 配置 VITE_OAUTH_PORTAL_URL..."
gh secret set VITE_OAUTH_PORTAL_URL -b"https://manus.im" -R $REPO

echo "9/18 配置 OWNER_OPEN_ID..."
gh secret set OWNER_OPEN_ID -b"LMBWJL8UUkwQiLcZHAbmRE" -R $REPO

echo "10/18 配置 OWNER_NAME..."
gh secret set OWNER_NAME -b"wangzuo250" -R $REPO

echo "11/18 配置 BUILT_IN_FORGE_API_URL..."
gh secret set BUILT_IN_FORGE_API_URL -b"https://forge.manus.ai" -R $REPO

echo "12/18 配置 BUILT_IN_FORGE_API_KEY..."
gh secret set BUILT_IN_FORGE_API_KEY -b"UKmuYX2chzteiZXV7v53Cf" -R $REPO

echo "13/18 配置 VITE_FRONTEND_FORGE_API_KEY..."
gh secret set VITE_FRONTEND_FORGE_API_KEY -b"gcgJqAUGLZwqbujh4Bcv95" -R $REPO

echo "14/18 配置 VITE_FRONTEND_FORGE_API_URL..."
gh secret set VITE_FRONTEND_FORGE_API_URL -b"https://forge.manus.ai" -R $REPO

echo "15/18 配置 VITE_ANALYTICS_ENDPOINT..."
gh secret set VITE_ANALYTICS_ENDPOINT -b"https://manus-analytics.com" -R $REPO

echo "16/18 配置 VITE_ANALYTICS_WEBSITE_ID..."
gh secret set VITE_ANALYTICS_WEBSITE_ID -b"3d548452-32b4-442e-9991-346dcc0d251a" -R $REPO

echo "17/18 配置 VITE_APP_LOGO..."
gh secret set VITE_APP_LOGO -b"https://files.manuscdn.com/user_upload_by_module/web_dev_logo/310519663327375198/eWGwizLmOwOtwVAw.png" -R $REPO

echo "18/18 配置 VITE_APP_TITLE..."
gh secret set VITE_APP_TITLE -b"Jun正坪工作室选题系统" -R $REPO

echo ""
echo "✅ 所有 18 个 Secrets 配置完成！"
echo ""
echo "验证配置："
gh secret list -R $REPO
