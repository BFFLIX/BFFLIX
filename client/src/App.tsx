
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import CirclesPage from "./pages/CirclePage";
import CircleDetailsPage from "./pages/CircleDetailsPage";
import CircleInviteAcceptPage from "./pages/CircleInviteAcceptPage";
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
        <Route path="/circles/:id" element={<CircleDetailsPage />} />
        <Route path="/circle-invite/:id/:code" element={<CircleInviteAcceptPage />} />
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
