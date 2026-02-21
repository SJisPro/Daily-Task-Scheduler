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
  
 ## 6. Troubleshooting "Failed to load tasks"
 If you see "Failed to load tasks" on the frontend:
 
 1. **Check Backend URL in Vercel**:
    - Go to Vercel Project Settings -> Environment Variables.
    - Ensure `VITE_API_URL` is set to your Render URL (e.g., `https://daily-task-backend.onrender.com`).
    - **Crucial**: After adding/changing variables, you **MUST Redeploy** (Go to Deployments -> Redeploy) for changes to take effect.
 
 2. **Check CORS in Render**:
    - Go to Render Dashboard -> Environment Variables.
    - Ensure `ALLOWED_ORIGINS` includes your Vercel URL (e.g., `https://daily-task-frontend.vercel.app`).
    - **No trailing slash** at the end of the URL.
 
 3. **Check Browser Console**:
    - Right-click on the page -> Inspect -> **Console** tab.
    - Look for red error messages.
    - If you see "Network Error" or "Connection Refused": Your API URL might be wrong or Backend is sleeping (Render free tier sleeps after 15 mins). Reload the backend page to wake it up.
    - If you see "CORS error": Check step 2.
    - Use the Network tab to see the failed request URL. It should look like `https://.../api/tasks/...`.
