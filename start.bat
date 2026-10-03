@echo off
title All Light - Golang & Angular
cd /d "%~dp0"
echo ==============================================
echo   All Light - ระบบควบคุมโคมไฟอัจฉริยะ
echo   Frontend: Angular 
echo   Backend : Golang (REST API + SSE)
echo ==============================================
echo.

if exist "allight-server.exe" (
    echo Starting Golang Server...
    start http://localhost:8080
    allight-server.exe
) else (
    echo Building and running Golang backend...
    go run ./backend/main.go
)
pause
