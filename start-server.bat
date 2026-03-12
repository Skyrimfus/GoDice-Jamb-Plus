@echo off

:: Start frontend server
start cmd /k "npm run dev"

:: Start backend server
start cmd /k "cd server && npm run dev"