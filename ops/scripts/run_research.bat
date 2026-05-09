@echo off
:: run_research.bat — запустить один research-скрипт и запушить результат
:: Установка: скопировать ярлык этого файла на рабочий стол рабочего ПК
:: Использование: дабл-клик → ввести slug (например: cohort_novosel_q1_2026)

:: Определяем корень репо относительно расположения скрипта
set REPO=%~dp0..\..

cd /d %REPO%

:: Обновить код
echo [1/4] git pull...
git pull origin main
if errorlevel 1 (
    echo ERROR: git pull failed
    pause
    exit /b 1
)

:: Активировать venv
echo [2/4] Activating venv...
call research\.venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: venv not found. Run bootstrap/work_pc.md first.
    pause
    exit /b 1
)

:: Запросить slug если не передан как аргумент
set SLUG=%1
if "%SLUG%"=="" (
    set /p SLUG=Enter research slug (e.g. cohort_novosel_q1_2026):
)

if "%SLUG%"=="" (
    echo ERROR: slug is required
    pause
    exit /b 1
)

:: Проверить что скрипт существует
set SCRIPT=research\scripts\%SLUG%\publish.py
if not exist %SCRIPT% (
    echo ERROR: script not found: %SCRIPT%
    echo DA-agent must create it first.
    pause
    exit /b 1
)

:: Запустить скрипт
echo [3/4] Running %SCRIPT%...
python %SCRIPT%
set EXIT_CODE=%errorlevel%

if %EXIT_CODE% neq 0 (
    echo.
    echo Script exited with code %EXIT_CODE%
    echo Check output above for errors.
    pause
    exit /b %EXIT_CODE%
)

:: Если есть файлы в _outbox — закоммитить (Path B)
echo [4/4] Checking outbox...
for /f %%i in ('dir /b ops\_outbox\*.json 2^>nul') do (
    echo Outbox files found, committing...
    git add ops\_outbox\
    git commit -m "data: outbox from work PC (%SLUG%)"
    git push origin main
    echo Outbox pushed. Run upload_outbox.py on personal PC.
    goto :done
)

echo Done. No outbox files (Path A: Firebase push OK).

:done
echo.
echo ====================================
echo  run_research.bat completed: %SLUG%
echo ====================================
pause
