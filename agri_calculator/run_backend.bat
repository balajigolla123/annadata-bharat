@echo off
title Annadata Bharat - PyMongo & ML Backend Server
echo ========================================================
echo Starting Annadata Bharat PyMongo Backend (MongoDB & ML)
echo ========================================================
py -3 run_backend.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Backend encountered an error. Trying with python...
    python run_backend.py
)
pause
