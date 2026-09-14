@echo off
if "%1"=="--version" (echo pg_restore ^(PostgreSQL^) 17.6) else (exit /b 1)
