@echo off
title DALOR SIGO-P - Laboratorio Local
cd /d "%~dp0"
echo ========================================================
echo   INICIANDO LABORATORIO LOCAL DALOR SIGO-P ERP
echo   Entorno Seguro Aislado (Sin conexion a Produccion)
echo ========================================================
echo.
echo Abriendo navegador en http://127.0.0.1:8000 ...
start http://127.0.0.1:8000
echo.
echo Iniciando servidor FastAPI / Uvicorn...
python -u run_server.py
pause
