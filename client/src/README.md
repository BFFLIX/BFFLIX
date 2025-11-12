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
- **JWT tokens** stored in localStorage for session persistence
- **ProtectedRoute** component guards routes that require authentication
- **Auto-restore sessions** on page reload using stored token
- After login/signup, users are redirected to `/home`

### How It Works
1. User logs in or signs up on `/auth` page
2. Credentials are sent to backend API at `https://bfflix.com`
3. On success, JWT token and user data are stored
4. User is redirected to `/home` (protected route)
5. On subsequent visits, token is validated with backend using `/auth/me` endpoint
6. If token is invalid/expired, user is redirected to login

## 🔌 API Integration

**Full API documentation is available in [API_INTEGRATION.md](./API_INTEGRATION.md)**

### Quick Start

The app connects to `https://bfflix.com` by default. You can override this by creating a `.env` file:

```env
VITE_API_URL=https://your-backend-url.com
```

### API Endpoints

All endpoints are prefixed with your base URL (default: `https://bfflix.com`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/signup` | POST | Register new user |
| `/auth/login` | POST | Authenticate user |
| `/auth/me` | GET | Get current user (requires token) |
| `/auth/request-reset` | POST | Request password reset email |
| `/auth/reset` | POST | Reset password with token |
| `/auth/logout` | POST | Logout user |

### Example: Login Request

```typescript
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Error Handling

The API uses standardized error formats:

```json
{
  "error": "validation",
  "fieldErrors": {
    "email": "Invalid email format"
  }
}
```

or

```json
{
  "error": "invalid_credentials",
  "message": "Email or password is incorrect"
}
```

See [API_INTEGRATION.md](./API_INTEGRATION.md) for complete error documentation.

## 📱 Current Pages

### `/auth` - Authentication Page
- Login form
- Signup form (with first name, last name, email, password confirmation)
- Password visibility toggles on all password fields
- Forgot password dialog (sends reset email)
- Terms & Privacy Policy modal
- Animated gradient background (purple → pink → red)

### `/home` - Home Page (Placeholder)
- Welcome message with user's name
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
- Glass-morphism effects with backdrop blur

## 📦 Key Dependencies

- **React Router** - Navigation
- **Motion (Framer Motion)** - Animations
- **Lucide React** - Icons
- **ShadCN UI** - Component library
- **Tailwind CSS** - Styling

## 🔐 Security Notes

- JWT tokens are stored in localStorage
- All API requests use HTTPS in production
- Passwords are never stored in frontend state
- Token is automatically cleared on 401 responses
- **Important**: BFFlix is not designed for collecting PII or securing sensitive data beyond basic authentication

## 🧪 Development & Testing

### Without Backend (Mock Mode)

To test the UI without a backend, modify `/lib/api.ts`:

```typescript
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  // Mock response for testing
  return {
    user: {
      id: '123',
      email: email,
      name: 'Test User'
    },
    token: 'mock-jwt-token'
  };
}
```

### With Backend

1. Ensure your backend is running at `https://bfflix.com` (or your configured URL)
2. Make sure all required endpoints are implemented (see API_INTEGRATION.md)
3. Test the following flows:
   - Sign up with new account
   - Login with existing credentials
   - Refresh page (session should persist)
   - Request password reset
   - Logout

## 📝 Implementation Notes

### User Data Structure

The backend uses a single `name` field, but the frontend UI collects first and last names separately for better UX. The names are combined before sending to the API:

```typescript
// Frontend collects:
firstName: "John"
lastName: "Doe"

// Sent to API as:
name: "John Doe"
```

### Session Persistence

On app initialization, the `AuthContext` automatically:
1. Checks for a stored JWT token
2. Calls `/auth/me` to validate the token
3. Restores the user session if valid
4. Redirects to `/home` if authenticated, or `/auth` if not

## 📝 Next Steps

1. ✅ API integration is complete and ready
2. Connect to your backend at `https://bfflix.com`
3. Build out additional pages (Circles, Profile, Trending, etc.)
4. Add more features to the Home page
5. Implement real-time features with WebSockets (if needed)
6. Add movie/show data integration (TMDB API, etc.)

## 🆘 Troubleshooting

**Issue: "Session expired" message on login**
- Check that your backend `/auth/me` endpoint is working
- Verify the JWT token format matches what your backend expects

**Issue: CORS errors**
- Ensure your backend has CORS enabled for your frontend domain
- Check that credentials are being sent with requests

**Issue: Login succeeds but user data is null**
- Verify the response format from `/auth/login` matches the expected structure
- Check browser console for API errors

For detailed API specifications, see [API_INTEGRATION.md](./API_INTEGRATION.md)
