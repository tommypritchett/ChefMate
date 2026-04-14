Kitcho AI: — Project Context for Claude

## App Overview
Mobile app for meal planning, recipe discovery, and pantry management with AI assistance.
Built with Expo/React Native (frontend) and Express/Prisma/SQLite (backend).
AI powered by OpenAI GPT-4o-mini for conversational cooking assistance and function-calling.

## Important: App Name
The working folder is named ChefMate but this name has a conflict with an existing
product ("ChefMate AI"). Do NOT use "ChefMate" as the brand name in any user-facing
strings, copy, or marketing content. Alternative names under consideration: Morso,
Kitcho, Forky. Confirm the active brand name before writing any UI copy.

## Tech Stack
- Frontend: Expo SDK 52, React Native with expo-router
- Styling: NativeWind v4 (Tailwind CSS for React Native)
- State Management: Zustand
- Backend: Express.js / Node.js + Prisma ORM
- Database: SQLite (development), PostgreSQL (production ready)
- AI: OpenAI GPT-4o-mini (conversational meal assistant)
- Auth: JWT tokens with expo-secure-store (native) / localStorage (web)
- API Client: Axios with token interceptor
- Package manager: npm

## Core Features
1. Conversational AI cooking assistant with function-calling (recipe search, inventory checks, meal planning)
2. Recipe database with 100+ recipes — search, filter, save favorites
3. Pantry/inventory management with expiration tracking
4. Meal planning calendar with nutrition tracking
5. Shopping list generation with Kroger price comparison (live API integration)
6. Health goals tracking (protein, calories, macros) with meal logging
7. Smart meal prep assistant for batch cooking
8. Voice input and photo upload for meal logging

## Architecture Decisions (do not change without asking)
- Expo managed workflow — do not eject
- REST API only, no GraphQL
- Prisma ORM for database operations (never use raw SQL without discussing first)
- All AI calls go through OpenAI service layer in backend/src/services/openai.ts
- Primary color: emerald green (#10b981) — do not change without approval
- All AI tool definitions in backend/src/services/ai-tools.ts

## Code Style
- Functional components only, no class components
- TypeScript for all frontend and backend code
- NativeWind className prop for styling (no StyleSheet.create)
- Use primary-500 for emerald brand color, not hardcoded hex values
- No console.log in committed code (use proper logging in backend)
- E2E tests in e2e-test.mjs using Playwright
- Prisma schema changes require migrations (npx prisma migrate dev)

## What Claude Should Always Do
- Check if a component already exists before creating a new one
- Run the build before declaring anything "done"
- Keep API keys and secrets out of code — use .env
- When uncertain about the brand name, ask before writing copy

## What Claude Should Never Do
- Eject from Expo managed workflow
- Change the Prisma schema without showing the migration first
- Install a new major dependency without flagging it first
- Use "ChefMate" as user-facing brand copy (use "Kitcho AI" instead)
