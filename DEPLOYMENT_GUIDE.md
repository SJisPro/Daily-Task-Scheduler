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
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app`
     *Note: We cd into `backend` because your `app` folder is inside `backend`.*
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
   - **Output Directory**: `dist` (Default is fine).
   - **Environment Variables**:
     - `VITE_API_URL`: Paste your Render Backend URL (e.g., `https://daily-task-backend.onrender.com`). **Must not end with a slash.**
5. Click **Deploy**.

## 4. Final Configuration
1. Go back to Render Dashboard -> Environment Variables.
2. Edit `ALLOWED_ORIGINS` and set it to your new Vercel App URL (e.g., `https://daily-task-frontend.vercel.app`).
3. Redeploy the backend if needed (Render usually restarts automatically on env change).

## 5. Notes
- **Database**: This setup uses a SQLite database on Render's disk. **Warning**: On the free tier, Render spins down services after inactivity, which **might wipe your data** if the disk is ephemeral. For permanent data, consider using a hosted Postgres database (like Render's managed Postgres or Neon.tech) and updating the `DATABASE_URL` in `database.py`.
