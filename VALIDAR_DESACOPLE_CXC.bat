@echo off
title DALOR SIGO-P - Validador de Desacople y Operatividad
cd /d "%~dp0"
echo ========================================================
echo   EJECUTANDO AUDITORIA DE FUNCIONAMIENTO EN VIVO
echo ========================================================
python validar_cxc.py
pause
