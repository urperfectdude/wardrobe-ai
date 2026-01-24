# 🚀 Deployment Guide for Wardrobe AI

Since **Wardrobe AI** is a React (Vite) Single Page Application (SPA), it can be deployed for **FREE** on several platforms.

The **recommended** platform is **Vercel** because it requires zero configuration for Vite apps and handles client-side routing automatically.

---

## Option 1: Vercel (Recommended & Easiest)

1.  **Sign Up/Login**: Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2.  **Add New Project**:
    *   Click **"Add New..."** -> **"Project"**.
    *   Select `wardrobe-ai` from your GitHub repositories list.
3.  **Configure**:
    *   Vercel will detect `Vite` automatically.
    *   **IMPORTANT**: Paste your Environment Variables.
        *   Expand "Environment Variables".
        *   Add `VITE_SUPABASE_URL` and your value.
        *   Add `VITE_SUPABASE_ANON_KEY` and your value.
        *   (You can find these in your local `.env` file).
4.  **Deploy**:
    *   Click **"Deploy"**.
    *   Wait ~1 minute. Your app will be live at `https://wardrobe-ai-yourname.vercel.app`!

---

## Option 2: Netlify

1.  **Sign Up/Login**: Go to [netlify.com](https://netlify.com) and log in with GitHub.
2.  **Add New Site**:
    *   Click **"Add new site"** -> **"Import an existing project"**.
    *   Select **GitHub** and authorize.
    *   Choose `wardrobe-ai`.
3.  **Build Settings**:
    *   Build command: `npm run build`
    *   Publish directory: `dist`
4.  **Environment Variables**:
    *   Click "Show advanced" or go to "Site settings" -> "Environment variables" after creation.
    *   Add your Supabase keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
5.  **Redirects Rule (Critical for SPA)**:
    *   You might need to add a `_redirects` file in your `public/` folder with the content:
        ```
        /*  /index.html  200
        ```
        (If you face 404 errors on refresh).

---

## Option 3: GitHub Pages (Directly on GitHub)

Since this app uses client-side routing (`react-router-dom`), GitHub Pages requires extra configuration to handle direct link navigation.

1.  **Install `gh-pages`**:
    ```bash
    npm install gh-pages --save-dev
    ```

2.  **Update `package.json`**:
    Add these scripts:
    ```json
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
    ```

3.  **Update `vite.config.js`**:
    Set the base path to your repo name:
    ```javascript
    base: '/wardrobe-ai/',
    ```

4.  **Deploy Command**:
    ```bash
    npm run deploy
    ```

*Note: You may encounter 404 errors on refresh with GitHub Pages unless you implement a "Single Page App hack" with a custom 404.html. Vercel avoids this issue entirely.*

---

## 🔑 Important: Supabase URL
Make sure your Supabase URL is whitelisted if you have any strict CORS settings in Supabase (usually open by default for development projects).
