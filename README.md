# Daily Task Scheduler 📅

A beautiful and warm task scheduling application that helps you manage your daily, weekly, and monthly tasks with reminders and completion tracking.

## Features

- ✅ **Day View**: View and manage tasks for a specific day in a tabular format
- 📆 **Week View**: See all tasks for the entire week in a 7-day grid
- 🗓️ **Month View**: Calendar view with task indicators for each day
- 🔔 **Reminders**: Automatic desktop notifications when task time arrives
- ✓ **Task Completion**: Mark tasks as complete with visual feedback
- 🎨 **Warm UI**: Beautiful, modern interface with warm color palette
- 📱 **Responsive**: Works on desktop and mobile devices

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **SQLite**: Lightweight database
- **APScheduler**: Task scheduling for reminders
- **Plyer**: Cross-platform desktop notifications

### Frontend
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **date-fns**: Date manipulation library

## Project Structure

```
Daily Task Scheduler/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI app entry point
│   │   ├── database.py      # Database configuration
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── reminder_service.py  # Reminder scheduling
│   │   └── routes/
│   │       └── tasks.py     # API routes
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service
│   │   ├── types/           # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── README.md
└── README.md
```

## Installation & Setup

### Prerequisites
- Python 3.8+ 
- Node.js 16+ and npm
- Git

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Create virtual environment:**
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Run the server:**
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start development server:**
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Usage

1. **Start both servers** (backend on port 8000, frontend on port 3000)

2. **Create Tasks:**
   - Click "New Task" button
   - Fill in task title, description (optional), date, and time
   - Click "Create Task"

3. **View Tasks:**
   - Switch between Day/Week/Month views using the navigation buttons
   - In Day view, select different dates using the date picker
   - In Week view, navigate between weeks using Previous/Next buttons
   - In Month view, navigate between months

4. **Complete Tasks:**
   - Click the checkbox next to a task to mark it as complete
   - Click again to unmark

5. **Edit/Delete Tasks:**
   - Click the edit icon to modify a task
   - Click the delete icon to remove a task

6. **Reminders:**
   - Desktop notifications will automatically appear when a task's scheduled time arrives
   - Notifications only appear for incomplete tasks
   - Make sure to allow notifications in your browser/system settings

## API Endpoints

- `GET /api/tasks/` - Get all tasks (optional `?date=YYYY-MM-DD` filter)
- `GET /api/tasks/{id}` - Get specific task
- `POST /api/tasks/` - Create new task
- `PUT /api/tasks/{id}` - Update task
- `PATCH /api/tasks/{id}/complete` - Mark task as complete
- `PATCH /api/tasks/{id}/uncomplete` - Mark task as incomplete
- `DELETE /api/tasks/{id}` - Delete task
- `GET /api/tasks/week/{start_date}` - Get week tasks
- `GET /api/tasks/month/{year}/{month}` - Get month tasks

## Development

### Backend Development
- The database file (`tasks.db`) will be created automatically on first run
- API documentation is available at `/docs` endpoint
- Reminder service runs in the background and checks every minute

### Frontend Development
- Hot reload is enabled in development mode
- TypeScript type checking is enabled
- Tailwind CSS is configured with custom warm color palette

## Production Deployment

### Backend
1. Set up a production WSGI server (e.g., Gunicorn)
2. Configure environment variables
3. Use PostgreSQL instead of SQLite for production
4. Set up proper CORS origins

### Frontend
1. Build the app: `npm run build`
2. Serve the `dist` folder using a web server (nginx, Apache, etc.)
3. Configure API proxy or CORS settings

## Troubleshooting

**Reminders not working:**
- Make sure desktop notifications are enabled in your system settings
- Check browser notification permissions
- Verify the backend reminder service is running

**CORS errors:**
- Ensure backend CORS middleware is configured correctly
- Check that frontend is using the correct API URL

**Database errors:**
- Delete `tasks.db` file to reset the database
- Ensure SQLite is properly installed

## License

This project is open source and available for personal and commercial use.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

