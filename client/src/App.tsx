
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import CirclesPage from "./pages/CirclePage";
import AiAssistantPage from "./pages/AiAssistantPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth / login */}
        <Route path="/" element={<AuthPage />} />

        {/* Main app pages */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/circles" element={<CirclesPage />} />
        <Route path="/assistant" element={<AiAssistantPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;