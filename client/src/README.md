# BFFlix - Social Movie Recommendation App

A social media platform for discovering movies and shows through circles of friends.

## 🏗️ Project Structure

```
├── App.tsx                          # Main router & app entry
├── pages/                           # Page components
│   ├── Auth.tsx                     # Login/Signup page
│   └── Home.tsx                     # Main dashboard (placeholder)
├── components/
│   ├── layout/                      # Layout components
│   │   ├── Logo.tsx                 # BFFlix logo
│   │   └── ProtectedRoute.tsx       # Route guard for authenticated routes
│   ├── figma/                       # Figma utilities
│   └── ui/                          # ShadCN UI components
├── contexts/
│   └── AuthContext.tsx              # Authentication state management
├── lib/
│   └── api.ts                       # Backend API calls
├── constants/
│   └── privacyPolicy.tsx            # Privacy policy content
└── styles/
    └── globals.css                  # Global styles
```

## 🔑 Authentication Flow

### Current Setup
- **AuthContext** manages user state across the app
- **localStorage** is used to persist login sessions
- **ProtectedRoute** component guards routes that require authentication
- After login/signup, users are redirected to `/home`

### How It Works
1. User logs in or signs up on `/auth` page
2. Credentials are sent to backend API (see API Integration below)
3. On success, user data is stored in context and localStorage
4. User is redirected to `/home` (protected route)
5. On subsequent visits, auth state is restored from localStorage

## 🔌 API Integration

### Setting Up Your Backend

The app is configured to make API calls to your backend. Update the API URL in `/lib/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
```

### Environment Variables

Create a `.env` file in the root directory:

```
VITE_API_URL=http://your-backend-url.com/api
```

### Required API Endpoints

Your backend should implement these endpoints:

#### 1. **POST** `/api/auth/login`
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### 2. **POST** `/api/auth/signup`
**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### 3. **POST** `/api/auth/reset-password`
**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Password reset email sent"
}
```

### Error Handling

API errors should return appropriate HTTP status codes with error messages:

```json
{
  "message": "Invalid credentials"
}
```

The frontend will display these error messages to users.

## 🧪 Testing Without Backend

The app will work without a backend, but API calls will fail. To test the UI:

1. Comment out the actual API calls in `/lib/api.ts`
2. Return mock data instead:

```typescript
export async function loginUser(email: string, password: string): Promise<User> {
  // Mock response for testing
  return {
    id: '123',
    email: email,
    firstName: 'Test',
    lastName: 'User'
  };
}
```

## 📱 Current Pages

### `/auth` - Authentication Page
- Login form
- Signup form (with first name, last name, email, password confirmation)
- Password visibility toggles
- Forgot password dialog
- Terms & Privacy Policy modal

### `/home` - Home Page (Placeholder)
- Welcome message
- User info display
- Logout button
- Placeholder cards for future features (Circles, Trending, Watchlist)

## 🚀 Adding New Pages

1. Create a new file in `/pages/`, e.g., `/pages/Circles.tsx`
2. Add the route in `/App.tsx`:

```tsx
import Circles from './pages/Circles';

// Inside Routes:
<Route
  path="/circles"
  element={
    <ProtectedRoute>
      <Circles />
    </ProtectedRoute>
  }
/>
```

## 🎨 Styling

- Uses **Tailwind CSS** v4.0
- Dark mode color scheme (Netflix-inspired)
- Animated background gradients (purple to red)
- ShadCN UI components for consistent design

## 📦 Key Dependencies

- React Router - Navigation
- Motion (Framer Motion) - Animations
- Lucide React - Icons
- ShadCN UI - Component library

## 🔐 Security Notes

- Passwords are sent to backend (ensure HTTPS in production)
- User data is stored in localStorage (consider more secure options for production)
- No PII should be collected without proper consent and security measures

## 📝 Next Steps

1. Set up your backend API
2. Update `VITE_API_URL` in `.env`
3. Test login/signup with real backend
4. Build out additional pages (Circles, Profile, etc.)
5. Add more features to the Home page
