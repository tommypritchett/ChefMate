# 🍳 ChefMate - AI-Powered Healthy Cooking App

> Transform your favorite fast food into healthy, protein-rich meals with the power of AI

[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Latest-green?logo=node.js)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-purple?logo=prisma)](https://prisma.io/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT-orange?logo=openai)](https://openai.com/)

ChefMate revolutionizes healthy cooking by transforming popular fast food items into nutritious, home-cooked meals. Using advanced AI and smart ingredient substitutions like Greek yogurt and 93% lean ground beef, we make healthy eating both delicious and accessible.

## ✨ Features

- **AI Recipe Generation**: Create custom healthy versions of fast food using OpenAI
- **Recipe Database**: Browse 100+ healthier fast food recipes
- **Smart Inventory Management**: Track food with photo recognition and expiration alerts
- **Shopping Lists**: Generate lists from recipes with store price comparison
- **Favorites & Organization**: Save and organize recipes in custom folders
- **Nutrition Tracking**: Log meals and track daily nutrition goals
- **Authentication**: Secure JWT-based user authentication

## 🛠️ Tech Stack

### Frontend
- React 18+ with TypeScript
- Tailwind CSS for styling
- Zustand for state management
- React Router for navigation
- React Query for API state management
- Axios for HTTP requests

### Backend
- Node.js with Express and TypeScript
- Prisma ORM with SQLite database
- JWT authentication with bcrypt
- Express validator for input validation
- CORS and Helmet for security

### Database Schema
- Users with subscription management
- Recipes with full nutrition data
- Inventory items with expiration tracking
- Shopping lists with store integration
- Meal logging for nutrition tracking
- AI chat history

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and navigate to the project**
   ```bash
   cd ~/MyMobileApp/ChefMate
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Add your OpenAI API key to .env
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   npm run build
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   # Server runs on http://localhost:3001
   ```

2. **Start the frontend (in a new terminal)**
   ```bash
   cd frontend
   PORT=3002 npm start
   # App runs on http://localhost:3002
   ```

3. **Access the Application**
   - Frontend: http://localhost:3002
   - Backend: http://localhost:3001
   - Test Login: `test@example.com` / `password123`

### Environment Variables

Create `.env` files in both frontend and backend directories:

**Backend (.env):**
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="chefmate-super-secret-jwt-key-for-development-only-min-32-chars"
OPENAI_API_KEY=""
PORT="3001"
NODE_ENV="development"
```

**Frontend (.env):**
```env
REACT_APP_API_URL=http://localhost:3001/api
```

## 📱 App Structure

### Pages
- **Home**: Dashboard with stats and quick actions
- **Recipes**: Browse and search recipe database
- **Recipe Detail**: Full recipe with ingredients, instructions, and nutrition
- **AI Generation**: Generate custom recipes with AI
- **Favorites**: Saved recipes organized in folders
- **Inventory**: Food management with expiration tracking
- **Shopping**: Smart shopping lists with store links
- **Profile**: User settings and subscription management

### Authentication
- Login/Register forms with validation
- JWT token storage in localStorage
- Protected routes with automatic redirects
- Password requirements and security

### Key Components
- `Layout`: Main app shell with navigation
- `LoadingSpinner`: Reusable loading states
- `AuthStore`: Zustand store for user authentication
- `API Service`: Centralized API client with interceptors

## 🎨 Design System

### Colors
- **Primary**: Orange (#ff6b35) - Energy/Food theme
- **Secondary**: Green (#4CAF50) - Fresh/Healthy theme
- **Accent**: Blue (#2196F3) - Premium features
- **Background**: Light gray (#fafafa)
- **Surface**: White (#ffffff)

### Typography
- **Display**: Fraunces (serif) for headings
- **Body**: DM Sans (sans-serif) for content

### Mobile-First Design
- Responsive grid layouts
- Touch-friendly buttons and inputs
- Bottom navigation for mobile
- Card-based UI components

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/me` - Update user profile

### Recipes
- `GET /api/recipes` - List recipes with filters
- `GET /api/recipes/:id` - Get single recipe
- `POST /api/recipes/:id/view` - Log recipe view

### AI Features
- `POST /api/ai/generate-recipe` - Generate custom recipe
- `POST /api/ai/chat` - Chat with AI assistant
- `GET /api/ai/chat/history` - Get chat history

### User Data
- `GET /api/favorites` - Get saved recipes
- `POST /api/favorites` - Save recipe
- `GET /api/inventory` - Get inventory items
- `POST /api/inventory` - Add inventory item
- `GET /api/shopping-lists` - Get shopping lists
- `POST /api/shopping-lists` - Create shopping list

## 🗄️ Database Models

### Core Models
- **User**: Authentication and profile data
- **Recipe**: Recipe content with nutrition
- **UserSavedRecipe**: Favorites with personal notes
- **RecipeFolder**: Organization system
- **InventoryItem**: Food tracking
- **ShoppingList**: Smart shopping features
- **MealLog**: Nutrition tracking
- **ChatMessage**: AI interactions

### Sample Data
The database is seeded with 3 example recipes:
- High Protein Quesarito (Taco Bell inspired)
- Crispy Baked Chicken Sandwich (Chick-fil-A inspired)
- Veggie Big Mac (McDonald's inspired)

## 🔮 Next Steps

### Phase 1: Core Features (Completed)
- ✅ Authentication system
- ✅ Recipe database and browsing
- ✅ Basic UI components
- ✅ Database schema and sample data

### Phase 2: Enhanced Features
- [ ] Connect OpenAI API for real AI generation
- [ ] Implement photo recognition for inventory
- [ ] Add real-time notifications
- [ ] Shopping list store integration
- [ ] Advanced filtering and search

### Phase 3: Premium Features
- [ ] Stripe subscription integration
- [ ] Advanced nutrition analytics
- [ ] Meal planning calendar
- [ ] Social features (recipe sharing)
- [ ] Mobile app deployment

### Phase 4: Scaling
- [ ] Performance optimization
- [ ] SEO and marketing site
- [ ] Admin dashboard
- [ ] Analytics and monitoring

## 🎯 Business Model

### Freemium Subscription
- **Free**: 5 AI recipes/month, basic features
- **Premium ($9.99/month)**: Unlimited AI, advanced features
- **Pro ($19.99/month)**: Nutrition coaching, meal plans

### Revenue Streams
- Subscription fees
- Grocery affiliate commissions (Instacart, Walmart)
- Premium recipe content
- Nutrition consulting partnerships

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Helmet security headers
- Rate limiting on expensive endpoints
- Environment variable protection

## 📊 Key Metrics

- Daily/Monthly Active Users
- Recipe generation usage
- Food waste reduction
- Money saved per user
- Conversion to premium subscriptions
- Grocery affiliate click-through rates

---

**ChefMate** - Making healthy cooking accessible, affordable, and intelligent. 🍳✨