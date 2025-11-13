import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import Auth from './pages/Auth';
import Home from './pages/Home';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth Route */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Home Route - bypassing protection for preview */}
          <Route path="/home" element={<Home />} />
          
          {/* Default redirect to home directly */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          
          {/* 404 - Redirect to home */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}