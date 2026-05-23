@echo off
echo ========================================================
echo          RWManage Clean Database Migration Tool
echo ========================================================
echo.
echo [1/3] Checking Node.js environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    pause
    exit /b %errorlevel%
)

echo [2/3] Resetting database and applying migrations...
echo (This will drop the existing tables, recreate them, and seed the database)
echo.
call npx prisma migrate reset --force

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to run prisma migrate reset!
    echo Please make sure your PostgreSQL database is running and credentials in .env are correct.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Generating Prisma Client...
call npx prisma generate

if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Failed to run prisma generate!
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo   Database reset, migrated, and seeded successfully!
echo ========================================================
echo.
pause
