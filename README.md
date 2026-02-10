# Next.js Auth Dashboard

A modern authentication dashboard built with Next.js, NextAuth.js, Prisma, and Neon Postgres.

## Features

- **Authentication**: secure login and signup with NextAuth.js
- **Database**: PostgreSQL database hosted on Neon
- **ORM**: Prisma v7 with driver adapters for serverless environments
- **Dashboard**:
  - Analytics Overview with charts
  - Project Management
  - User Settings
- **Admin Panel**:
  - User approval workflow
  - Role management (Admin/User)
- **Security**:
  - Protected routes via Middleware
  - Password hashing with bcrypt
  - Admin-only areas

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/)
- **Auth**: [NextAuth.js v5](https://authjs.dev/)
- **Database**: [Neon](https://neon.tech/) (PostgreSQL)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Styling**: Tailwind CSS & CSS Modules

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/hp974065-cpu/auth-dashboard.git
   cd auth-dashboard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file with:
   ```env
   DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
   AUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Run migrations**:
   ```bash
   npx prisma db push
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to see the app.
