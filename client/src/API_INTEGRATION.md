# BFFlix API Integration Guide

## Overview
This document describes how BFFlix integrates with the backend API at `https://bfflix.com`.

## Authentication Flow

### JWT Token Management
- Tokens are stored in `localStorage` using the key `token`
- The `Authorization` header is set as `Bearer <token>` for authenticated requests
- Tokens are automatically cleared on logout or when expired

### API Endpoints

#### 1. Sign Up
- **Endpoint**: `POST /auth/signup`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123",
    "name": "John Doe"
  }
  ```
- **Response (201)**:
  ```json
  {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "jwt-token-here"
  }
  ```
- **UI Note**: The frontend collects first and last name separately, then combines them as a single `name` field before sending to the API.

#### 2. Login
- **Endpoint**: `POST /auth/login`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123"
  }
  ```
- **Response (200)**:
  ```json
  {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "jwt-token-here"
  }
  ```

#### 3. Get Current User
- **Endpoint**: `GET /auth/me`
- **Headers**: 
  ```
  Authorization: Bearer <jwt-token>
  ```
- **Response (200)**:
  ```json
  {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
  ```
- **Usage**: Called on app initialization to restore user session

#### 4. Request Password Reset
- **Endpoint**: `POST /auth/request-reset`
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response (200)**:
  ```json
  {
    "ok": true
  }
  ```

#### 5. Reset Password (with token)
- **Endpoint**: `POST /auth/reset`
- **Request Body**:
  ```json
  {
    "token": "reset-token-from-email",
    "newPassword": "newSecurePassword123"
  }
  ```
- **Response (200)**:
  ```json
  {
    "ok": true
  }
  ```
- **Note**: This endpoint is currently not used in the UI but is available for future implementation

#### 6. Logout
- **Endpoint**: `POST /auth/logout`
- **Headers**: 
  ```
  Authorization: Bearer <jwt-token>
  ```
- **Response**: `204 No Content`

## Error Handling

### Error Response Format

#### Validation Errors (400)
```json
{
  "error": "validation",
  "fieldErrors": {
    "email": "Invalid email",
    "password": "Too weak"
  }
}
```

#### Invalid Credentials (401)
```json
{
  "error": "invalid_credentials",
  "message": "Email or password is incorrect"
}
```

#### Conflict (409) - e.g., Email already registered
```json
{
  "error": "conflict",
  "message": "Email already registered"
}
```

#### Unauthorized (401)
```json
{
  "error": "unauthorized"
}
```

#### Invalid Token (400)
```json
{
  "error": "invalid_token",
  "message": "Reset token is invalid or expired"
}
```

## Implementation Files

### `/lib/api.ts`
Contains all API functions:
- `loginUser(email, password)` - Authenticates user
- `signupUser(name, email, password)` - Registers new user
- `getCurrentUser()` - Fetches current authenticated user
- `requestPasswordReset(email)` - Sends password reset email
- `resetPassword(token, newPassword)` - Resets password with token
- `logoutUser()` - Logs out user
- `getToken()`, `setToken()`, `clearToken()` - Token management utilities

### `/contexts/AuthContext.tsx`
React Context that provides:
- `user` - Current user object or `null`
- `isLoading` - Loading state during authentication check
- `login(email, password)` - Login function
- `signup(name, email, password)` - Signup function
- `logout()` - Logout function

### `/pages/Auth.tsx`
Authentication page with:
- Login form
- Signup form (with separate first/last name fields)
- Forgot password modal
- Terms & Privacy Policy modal

### `/components/layout/ProtectedRoute.tsx`
Route wrapper that:
- Redirects unauthenticated users to `/auth`
- Shows loading state while checking authentication
- Allows authenticated users to access protected routes

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_URL=https://bfflix.com
```

If `VITE_API_URL` is not set, the app defaults to `https://bfflix.com`.

## Session Management

1. **On App Load**: 
   - `AuthContext` calls `getCurrentUser()` to check if a valid token exists
   - If valid, user is restored and redirected to `/home`
   - If invalid or missing, user remains on `/auth`

2. **On Login/Signup**:
   - Token is stored in `localStorage`
   - User object is set in AuthContext
   - App redirects to `/home`

3. **On Logout**:
   - Token is cleared from `localStorage`
   - User is set to `null`
   - Backend logout endpoint is called
   - User is redirected to `/auth`

## Testing the Integration

To test the API integration locally or in development:

1. Set `VITE_API_URL` in your `.env` file
2. Ensure the backend is running and accessible
3. Try the following flows:
   - Sign up with a new account
   - Login with existing credentials
   - Request a password reset
   - Logout and login again
   - Refresh the page (should maintain session if token is valid)

## Security Notes

- Tokens are stored in `localStorage` (consider using `httpOnly` cookies in production)
- All API requests use HTTPS in production
- Passwords are never stored in frontend state longer than necessary
- Token is automatically cleared on 401 responses
