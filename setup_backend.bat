@echo off
echo Setting up backend...
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
echo Backend setup complete!
echo.
echo To run the backend server, use:
echo cd backend
echo venv\Scripts\activate
echo uvicorn app.main:app --reload --port 8000

