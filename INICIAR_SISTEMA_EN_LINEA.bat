@echo off
title DALOR SIGO-P - Servidor y Tunel Publico
color 0B
echo ==============================================================================
echo       DALOR SIGO-P - ERP MODULAR CON POWERBI & ACCESO MUNDIAL
echo ==============================================================================
echo.
echo 1. Iniciando servidor FastAPI local en http://127.0.0.1:8000 ...
start /B python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

timeout /t 3 >nul

echo 2. Iniciando tunel seguro Cloudflare a nivel mundial...
echo.
python start_tunnel.py

pause
