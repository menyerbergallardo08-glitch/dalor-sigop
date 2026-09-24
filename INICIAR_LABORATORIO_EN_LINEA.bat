@echo off
title DALOR SIGO-P - Laboratorio Local en Linea (HTTPS)
echo ========================================================
echo   DALOR SIGO-P - INICIANDO LABORATORIO EN LINEA (HTTPS)
echo ========================================================
echo.
echo 1. Iniciando Servidor Backend Local...
start /B python run_server.py
timeout /t 3 /nobreak >nul
echo.
echo 2. Levantando Tunel Seguro HTTPS (Cloudflare)...
echo.
echo Copia el enlace HTTPS (ej: https://...trycloudflare.com)
echo y abrelo directamente en tu telefono celular.
echo.
cloudflared.exe tunnel --url http://127.0.0.1:8000
pause
