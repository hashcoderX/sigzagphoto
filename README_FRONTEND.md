# Stock Photographer - Frontend

Next.js frontend application for the Stock Photographer project.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Tech Stack

- Next.js 16 with App Router
- TypeScript
- Tailwind CSS
- ESLint

## Project Structure

- `/src/app` - App Router pages and layouts
- `/src/components` - Reusable React components
- `/public` - Static assets

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## API Integration

The frontend connects to the Laravel backend API at `http://localhost:8000/api`
