@echo off
title DALOR SIGO-P - Modo Local
color 0B
echo ================================================================
echo           INICIANDO DALOR SIGO-P (MODO LOCAL)
echo ================================================================
echo.

cd /d "%~dp0\backend"

echo [1/2] Iniciando Servidor Backend...
start /b python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

timeout /t 2 >nul

echo [2/2] Abriendo Sistema en el Navegador...
start http://localhost:8000

echo.
echo Sistema activo en: http://localhost:8000
echo (Presiona cualquier tecla para cerrar esta ventana)
pause >nul
