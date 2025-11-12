import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { loginUser, signupUser, logoutUser, getCurrentUser, User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      // Don't check auth if component unmounted
      if (!isMounted) return;

      try {
        // Check if token exists before making API call
        let token: string | null = null;
        try {
          token = localStorage.getItem('token');
        } catch (e) {
          console.warn('localStorage access error:', e);
        }

        if (!token) {
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        // Try to get current user from backend using stored token
        try {
          const userData = await getCurrentUser();
          if (isMounted) {
            setUser(userData);
          }
        } catch (error) {
          // Network or API error - don't throw, just clear state
          console.warn('Could not restore session:', error);
          if (isMounted) {
            setUser(null);
          }
          // Clear invalid token
          try {
            localStorage.removeItem('token');
          } catch (e) {
            console.warn('localStorage clear error:', e);
          }
        }
      } catch (error) {
        // Catch any other unexpected errors
        console.error('Unexpected error during auth check:', error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { user: userData } = await loginUser(email, password);
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const { user: userData } = await signupUser(name, email, password);
      setUser(userData);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
