# Deployment Guide

## 1. Prerequisites
- A GitHub account.
- Push this code to a new GitHub repository.

## 2. Deploy Backend to Render
1. Create an account at [render.com](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Settings:
   - **Name**: `daily-task-backend` (or similar)
   - **Root Directory**: `backend` (Important: Click 'Advanced' or 'Root Directory' setting to find this)
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app`
5. **Environment Variables**:
   - `DISABLE_NOTIFICATIONS`: `true` (Important!)
   - `ALLOWED_ORIGINS`: `https://your-frontend-app.vercel.app` (You will update this after deploying frontend)
6. Click **Create Web Service**.
7. Wait for deployment. Copy the **Service URL** (e.g., `https://daily-task-backend.onrender.com`).

## 3. Deploy Frontend to Vercel
1. Create an account at [vercel.com](https://vercel.com/).
2. Click **Add New ...** -> **Project**.
3. Import your GitHub repository.
4. Settings:
   - **Root Directory**: `frontend` (Click Edit and select the `frontend` folder).
   - **Build Command**: `npm run build` (Default is fine).
   - **Output Directory**: `dist` (This is the default for Vite).
   - **Environment Variables**:
     - `VITE_API_URL`: Paste your Render Backend URL (e.g., `https://daily-task-backend.onrender.com`). **Must not end with a slash.**
5. Click **Deploy**.

## 4. Final Configuration
1. Go back to Render Dashboard -> Environment Variables.
2. Edit `ALLOWED_ORIGINS` and set it to your new Vercel App URL (e.g., `https://daily-task-frontend.vercel.app`).
3. Redeploy the backend if needed (Render usually restarts automatically on env change).

## 5. Notes
- **Database**: By default, this app uses SQLite, which is ephemeral on Render (data wipes on restart).
- **For Permanent Data**:
  1. Create a PostgreSQL database (e.g., via Render Dashboard -> New + -> PostgreSQL).
  2. Copy the `Internal Database URL` (if deploying backend on Render) or `External Database URL`.
  3. In your Render Web Service **Environment Variables**, add:
     - Key: `DATABASE_URL`
     - Value: `postgres://...` (your connection string).
  4. The app will automatically detect this and switch to PostgreSQL.
