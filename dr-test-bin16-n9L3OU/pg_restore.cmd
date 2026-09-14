@echo off
if "%1"=="--version" (echo pg_restore ^(PostgreSQL^) 16.15) else (exit /b 1)
