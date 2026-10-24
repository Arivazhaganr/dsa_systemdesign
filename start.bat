@echo off
REM Serves AlgoQuest at http://localhost:8000 and opens it in your browser.
cd /d "%~dp0"
set PORT=8000
where python >nul 2>nul && (
  start "" http://localhost:%PORT%
  python -m http.server %PORT%
  goto :eof
)
where py >nul 2>nul && (
  start "" http://localhost:%PORT%
  py -m http.server %PORT%
  goto :eof
)
where npx >nul 2>nul && (
  start "" http://localhost:%PORT%
  npx --yes http-server -p %PORT% -c-1
  goto :eof
)
echo Python or Node.js is needed. Install one, or just double-click index.html.
pause
