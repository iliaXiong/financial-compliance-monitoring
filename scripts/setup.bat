@echo off
REM Financial Compliance Monitoring System - Setup Script for Windows

echo ==========================================
echo 金融合规政策监测系统 - 环境设置
echo ==========================================
echo.

REM Check Node.js
echo 检查 Node.js 版本...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js 未安装。请安装 Node.js ^>= 18.x
    exit /b 1
)
node -v
echo ✓ Node.js 已安装

REM Check npm
echo 检查 npm...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm 未安装
    exit /b 1
)
npm -v
echo ✓ npm 已安装

echo.
echo ==========================================
echo 安装依赖
echo ==========================================

REM Install root dependencies
echo 安装根目录依赖...
call npm install

REM Install backend dependencies
echo 安装后端依赖...
cd backend
call npm install
cd ..

REM Install frontend dependencies
echo 安装前端依赖...
cd frontend
call npm install
cd ..

echo ✓ 所有依赖安装完成

echo.
echo ==========================================
echo 配置环境变量
echo ==========================================

REM Setup backend .env
if not exist backend\.env (
    echo 创建后端环境变量文件...
    copy backend\.env.example backend\.env
    echo ✓ 已创建 backend\.env
    echo   请编辑此文件填入实际配置
) else (
    echo ✓ backend\.env 已存在
)

REM Setup frontend .env
if not exist frontend\.env (
    echo 创建前端环境变量文件...
    copy frontend\.env.example frontend\.env
    echo ✓ 已创建 frontend\.env
) else (
    echo ✓ frontend\.env 已存在
)

echo.
echo ==========================================
echo 设置完成！
echo ==========================================
echo.
echo 下一步：
echo 1. 启动 PostgreSQL 和 Redis (或使用 docker-compose up -d)
echo 2. 创建数据库: createdb financial_compliance
echo 3. 运行数据库迁移: cd backend ^&^& npm run migrate
echo 4. 启动后端: npm run dev:backend
echo 5. 启动前端: npm run dev:frontend
echo.
echo 访问应用:
echo - 前端: http://localhost:5173
echo - 后端: http://localhost:3000
echo.

pause
