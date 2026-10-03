# 🚀 EBA Fashion Studio — Hostinger & GitHub Deployment Guide

This guide walks you through deploying **EBA Fashion Studio** to **Hostinger** using **GitHub** and **Vite**.

---

## 📋 Architecture Overview

- **Frontend**: Built with **Vite** into an ultra-fast production bundle in `dist/`.
- **Backend**: **Node.js / Express** (`server.js`) serving APIs, handling authentication, and serving the Vite production build.
- **Database**: **Supabase PostgreSQL** cloud backend (`ydycwzcfptlbfvzbyzlb.supabase.co`) with local SQLite fallback.
- **Hosting**: **Hostinger** (hPanel with Node.js support / Cloud Hosting / VPS).

---

## Step 1: Initialize Git and Push to GitHub

If you haven't initialized your Git repository yet, run these commands in your project terminal:

```bash
# 1. Initialize git
git init

# 2. Add all prepared files (respecting .gitignore which keeps .env and node_modules safe)
git add .

# 3. Create your initial commit
git commit -m "feat: complete EBA Fashion Studio with Vite build and Hostinger readiness"

# 4. Set main branch
git branch -M main

# 5. Link your GitHub repository (replace with your actual GitHub URL)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ebafs-fashion-studio.git

# 6. Push to GitHub
git push -u origin main
```

---

## Step 2: Configure Hostinger (hPanel)

### Method A: Hostinger Node.js Application (Recommended)

1. Log in to your **[Hostinger hPanel](https://hpanel.hostinger.com)**.
2. In the sidebar or search bar, locate **Node.js**.
3. Click **Create Application**:
   - **Node.js Version**: Select `20.x` or `18.x`.
   - **Application Root**: `public_html` (or `ebafs`).
   - **Application Startup File**: `server.js`.
4. Click **Environment Variables** (or edit `.env` in File Manager):
   Add the following variables:
   ```env
   PORT=3000
   SUPABASE_PROJECT_ID=ydycwzcfptlbfvzbyzlb
   SUPABASE_URL=https://ydycwzcfptlbfvzbyzlb.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeWN3emNmcHRsYmZ2emJ5emxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMzU5MTUsImV4cCI6MjEwNjYxMTkxNX0.ut6c3mQb629R744VWAEFBTYzCXShFoFyPpmta8_8rWA
   JWT_SECRET=ebafs_luxury_secret_jwt_key_2025_atelier
   ```
5. Click **Save** and then run:
   ```bash
   npm install
   npm run build
   ```
6. Start or Restart your Node.js application.

---

### Method B: Hostinger Git Auto-Deployment

1. In Hostinger hPanel, go to **Advanced > Git**.
2. Click **Create a New Repository**:
   - **Repository URL**: `https://github.com/YOUR_GITHUB_USERNAME/ebafs-fashion-studio.git`
   - **Branch**: `main`
   - **Install path**: `public_html`
3. Click **Create**.
4. Set up **Automatic Webhook Deployment**:
   - Copy the Webhook URL provided by Hostinger.
   - Go to your GitHub repository -> **Settings > Webhooks > Add webhook**.
   - Paste the Hostinger URL, set Content Type to `application/json`, and save.
   - Now, whenever you push code to GitHub (`git push`), Hostinger will automatically pull the changes!

---

## Step 3: Run Vite Build on Hostinger

Whenever the application deploys, Vite builds the production frontend:

```bash
# Install dependencies
npm install

# Build static assets with Vite (outputs to dist/)
npm run build

# Start production server
npm start
```

---

## Step 4: Configure Domain & Free SSL

1. In Hostinger hPanel, navigate to **Domains** -> your domain (`ebafashion.pk` or custom domain).
2. Go to **Security > SSL**.
3. Activate the **Free Let's Encrypt SSL Certificate**.
4. Enable **Force HTTPS**.

---

## 🛠️ Handy npm Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Runs Vite development server with API proxy |
| `npm run build` | Builds optimized production bundle into `dist/` |
| `npm run preview` | Previews the Vite production build locally |
| `npm start` | Launches full-stack Node.js server (`server.js`) |
| `npm run supabase:sync` | Syncs local data to Supabase Cloud |
