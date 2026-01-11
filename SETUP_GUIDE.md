# Complete Setup Guide - Daily Task Scheduler

This guide will walk you through setting up and running the Daily Task Scheduler application step by step.

## Prerequisites

Before you begin, make sure you have the following installed:

1. **Python 3.8 or higher**
   - Download from: https://www.python.org/downloads/
   - During installation, check "Add Python to PATH"

2. **Node.js 16 or higher and npm**
   - Download from: https://nodejs.org/
   - npm comes bundled with Node.js

3. **Git** (optional, for version control)
   - Download from: https://git-scm.com/downloads

## Step-by-Step Setup

### Step 1: Verify Prerequisites

Open a terminal/command prompt and verify installations:

```bash
# Check Python version
python --version
# Should show Python 3.8 or higher

# Check Node.js version
node --version
# Should show v16 or higher

# Check npm version
npm --version
# Should show version number
```

### Step 2: Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Create virtual environment:**
```bash
# Windows
python -m venv venv

# Linux/Mac
python3 -m venv venv
```

3. **Activate virtual environment:**
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

You should see `(venv)` in your terminal prompt, indicating the virtual environment is active.

4. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

This will install:
- FastAPI (web framework)
- Uvicorn (ASGI server)
- SQLAlchemy (database ORM)
- APScheduler (task scheduling)
- Plyer (desktop notifications)
- And other dependencies

5. **Verify backend setup:**
```bash
# You should be able to import the app
python -c "from app.main import app; print('Backend setup successful!')"
```

### Step 3: Frontend Setup

1. **Open a NEW terminal window** (keep backend terminal open)

2. **Navigate to frontend directory:**
```bash
cd frontend
```

3. **Install Node.js dependencies:**
```bash
npm install
```

This will install:
- React and React DOM
- TypeScript
- Vite (build tool)
- Tailwind CSS
- React Router
- Axios
- date-fns
- And other dependencies

This may take a few minutes.

4. **Verify frontend setup:**
```bash
# Check if node_modules exists
dir node_modules
# Windows: dir node_modules
# Linux/Mac: ls node_modules
```

### Step 4: Running the Application

#### Start Backend Server

1. **In the backend terminal** (with venv activated):
```bash
cd backend
# Make sure venv is activated
uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
Reminder service started
INFO:     Application startup complete.
```

2. **Verify backend is running:**
   - Open browser and go to: http://localhost:8000
   - You should see: `{"message":"Daily Task Scheduler API","version":"1.0.0"}`
   - API docs: http://localhost:8000/docs

#### Start Frontend Server

1. **In the frontend terminal:**
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

2. **Open the application:**
   - Open browser and go to: http://localhost:3000
   - You should see the Task Scheduler interface

### Step 5: Using the Application

1. **Create Your First Task:**
   - Click the "+ New Task" button (or click on a day in Week/Month view)
   - Fill in:
     - Task Title (required)
     - Description (optional)
     - Date (required)
     - Time (required)
   - Click "Create Task"

2. **View Tasks:**
   - **Day View**: See all tasks for a specific day
   - **Week View**: See tasks for the entire week in a grid
   - **Month View**: See tasks in a calendar format

3. **Complete Tasks:**
   - Click the checkbox next to a task to mark it complete
   - Click again to unmark

4. **Edit/Delete Tasks:**
   - Click the edit icon (pencil) to modify a task
   - Click the delete icon (trash) to remove a task

5. **Reminders:**
   - Desktop notifications will appear automatically when a task's scheduled time arrives
   - Make sure notifications are enabled in your system settings
   - The reminder service runs in the background

## Troubleshooting

### Backend Issues

**Problem: `uvicorn: command not found`**
- Solution: Make sure virtual environment is activated
- Try: `pip install uvicorn` again

**Problem: `ModuleNotFoundError`**
- Solution: Make sure all dependencies are installed
- Try: `pip install -r requirements.txt` again

**Problem: Port 8000 already in use**
- Solution: Use a different port: `uvicorn app.main:app --reload --port 8001`
- Update frontend `vite.config.ts` proxy to match

**Problem: Database errors**
- Solution: Delete `tasks.db` file in backend directory to reset database
- The database will be recreated automatically

### Frontend Issues

**Problem: `npm: command not found`**
- Solution: Make sure Node.js is installed and added to PATH
- Restart terminal after installing Node.js

**Problem: `npm install` fails**
- Solution: Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

**Problem: Port 3000 already in use**
- Solution: Vite will automatically use next available port
- Or specify port: `npm run dev -- --port 3001`

**Problem: Cannot connect to backend**
- Solution: Make sure backend is running on port 8000
- Check `vite.config.ts` proxy settings
- Check browser console for CORS errors

### Reminder Issues

**Problem: Notifications not appearing**
- Solution (Windows): Check Windows notification settings
- Solution (Linux): Install `libnotify-bin`: `sudo apt-get install libnotify-bin`
- Solution (Mac): Check System Preferences > Notifications

**Problem: Reminders not triggering**
- Solution: Check backend terminal for reminder service messages
- Verify task time matches current time (within the same minute)
- Check that task is not already completed

## Quick Start Scripts (Windows)

You can use the provided batch files for quick setup:

1. **Setup Backend:**
```bash
setup_backend.bat
```

2. **Setup Frontend:**
```bash
setup_frontend.bat
```

## Development Tips

1. **Hot Reload**: Both frontend and backend support hot reload
   - Backend: Automatically reloads on code changes
   - Frontend: Automatically refreshes browser on code changes

2. **API Testing**: Use the Swagger UI at http://localhost:8000/docs
   - Test all API endpoints interactively
   - See request/response schemas

3. **Database**: SQLite database file is created automatically
   - Location: `backend/tasks.db`
   - Can be opened with any SQLite browser

4. **Logs**: Check terminal output for errors and debug information

## Next Steps

- Customize colors in `frontend/tailwind.config.js`
- Add more features (categories, recurring tasks, etc.)
- Deploy to production (see main README.md)

## Getting Help

If you encounter issues:
1. Check the error messages in terminal
2. Verify all prerequisites are installed correctly
3. Make sure both servers are running
4. Check browser console for frontend errors
5. Review the main README.md for more information

Happy task scheduling! 🎉

