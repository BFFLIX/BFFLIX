import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import CirclesPage from "./pages/CirclePage";
import CircleDetailsPage from "./pages/CircleDetailsPage";
import AiAssistantPage from "./pages/AiAssistantPage";
import ViewingsPage from "./pages/ViewingsPage";
import ProfilePage from "./pages/ProfilePage";
import AppLayout from "./components/AppLayout"; // NEW

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication */}
        <Route path="/" element={<AuthPage />} />

        {/* All pages that use the topbar + layout */}
        <Route element={<AppLayout><Outlet /></AppLayout>}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/circles" element={<CirclesPage />} />
          <Route path="/circles/:id" element={<CircleDetailsPage />} />
          <Route path="/viewings" element={<ViewingsPage />} />
          <Route path="/ai" element={<AiAssistantPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;