@echo off
cd /d "%~dp0"
call "%APPDATA%\fnm\fnm.exe" use --lts
node --loader ts-node/esm seed.ts