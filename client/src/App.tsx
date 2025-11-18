
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import CirclesPage from "./pages/CirclePage";
import AiAssistantPage from "./pages/AiAssistantPage";
import ViewingsPage from "./pages/ViewingsPage";
import ProfilePage from "./pages/ProfilePage";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login / auth */}
        <Route path="/" element={<AuthPage />} />

        {/* Main app pages */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/circles" element={<CirclesPage />} />
        <Route path="/viewings" element={<ViewingsPage />} />
        <Route path="/ai" element={<AiAssistantPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;