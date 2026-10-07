# IHCDT Scholarship Portal

This is the production-ready online document submission portal for the NNPC/SEPNU JV Ibeno Host Community Development Trust (IHCDT) Scholarship Scheme.

## Technologies Used
- Next.js (App Router)
- React
- Tailwind CSS
- Prisma ORM with SQLite (can be migrated to PostgreSQL)
- JWT (Jose) for Admin Authentication
- Nodemailer for Confirmation Emails

## Features
- Multi-step application form with dynamic requirements (Fresh vs Returning).
- Secure document uploads (client/server size and mime-type validation).
- File storage securely outside of the `public` directory.
- Admin dashboard to view applications, change statuses, and download documents securely.
- Responsive design for mobile and desktop.

## Local Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your actual SMTP details for emails and set a strong `ADMIN_PASSWORD`.

3. **Database Initialization**
   Run the Prisma migration to create the SQLite database:
   ```bash
   npx prisma db push
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   The portal will be available at [http://localhost:3000](http://localhost:3000).

## Production Deployment Instructions

1. Set environment variables on your hosting provider (e.g., Vercel, AWS).
2. Ensure you have persistent storage for the `./storage/documents` folder, or update `src/lib/storage.ts` to use an S3 bucket or equivalent cloud storage if deploying to a serverless platform like Vercel.
3. If using Vercel, update the `DATABASE_URL` in `.env` to point to a PostgreSQL database (like Supabase or Neon) and run `npx prisma db push` against it.
4. Run the build process:
   ```bash
   npm run build
   ```
5. Start the production server:
   ```bash
   npm start
   ```

## Admin Access
- Navigate to `/admin/login`.
- Login using the password set in your `ADMIN_PASSWORD` environment variable (default: `admin123`).
