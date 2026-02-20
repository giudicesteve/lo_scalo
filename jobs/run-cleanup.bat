@echo off
echo ============================================
echo  CLEANUP PENDING ORDERS - Lo Scalo
echo ============================================
echo.

cd /d "%~dp0\.."

npx tsx jobs\cleanup-pending-orders.ts

echo.
echo ============================================
pause
