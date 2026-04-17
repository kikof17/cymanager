import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import HomePage from "./pages/HomePage";
import BeginnerGuidePage from "./pages/BeginnerGuidePage";
import RosterPage from "./pages/RosterPage";
import TrainingPage from "./pages/TrainingPage";
import RacesPage from "./pages/RacesPage";
import TodoPage from "./pages/TodoPage";
import SettingsPage from "./pages/SettingsPage";

import CalendarPage from "./pages/CalendarPage";
import ResultPage from "./pages/ResultPage";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/guide" element={<BeginnerGuidePage />} />
        <Route path="/effectif" element={<RosterPage />} />
        <Route path="/entrainement" element={<TrainingPage />} />
        <Route path="/courses" element={<RacesPage />} />
        <Route path="/todo" element={<TodoPage />} />
        <Route path="/parametres" element={<SettingsPage />} />
        <Route path="/calendrier" element={<CalendarPage />} />
        <Route path="/resultats" element={<ResultPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}