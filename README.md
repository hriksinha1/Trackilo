# Hotel Booking Manager

A comprehensive, multi-property Property Management System (PMS) built with React and Appwrite.

## Architecture Migration
The application has been successfully migrated from Supabase to **Appwrite** for its backend infrastructure.

## Deployment to Netlify
Since the app is a pure Client-Side SPA (Single Page Application) built with Vite, it is perfectly suited for zero-config Netlify deployment.
1. Push this repository to GitHub.
2. Log in to Netlify and select **Add new site** > **Import an existing project**.
3. Choose your GitHub repository.
4. Set the **Build Command** to: `npm run build`
5. Set the **Publish directory** to: `dist`
6. Add your Environment Variables in the Netlify dashboard (`VITE_APPWRITE_ENDPOINT`, `VITE_APPWRITE_PROJECT`).
7. Deploy! Netlify will automatically handle the routing fallback to `index.html`.

## Appwrite Configuration
Before using the app, you must configure your Appwrite database. Follow the instructions in `APPWRITE_SETUP.md` at the root of the project to set up your Database and Collections.
