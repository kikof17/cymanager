import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";

const HomePage = lazy(() => import("./pages/HomePage"));
const BeginnerGuidePage = lazy(() => import("./pages/BeginnerGuidePage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const RosterPage = lazy(() => import("./pages/RosterPage"));
const TrainingPage = lazy(() => import("./pages/TrainingPage"));
const RacesPage = lazy(() => import("./pages/RacesPage"));
const TodoPage = lazy(() => import("./pages/TodoPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const RankingPage = lazy(() => import("./pages/RankingPage"));
const FinancePage = lazy(() => import("./pages/FinancePage"));
const StatisticsPage = lazy(() => import("./pages/StatisticsPage"));
const TransfersPage = lazy(() => import("./pages/TransfersPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const ResultPage = lazy(() => import("./pages/ResultPage"));
const MultiSeasonPlanningPage = lazy(() => import("./pages/MultiSeasonPlanningPage"));

function RouteFallback() {
  return (
    <div className="message-box">
      <p className="muted">Chargement de la page...</p>
    </div>
  );
}

export default function App() {
  return (
    <AppLayout>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/guide" element={<BeginnerGuidePage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/effectif" element={<RosterPage />} />
          <Route path="/transferts" element={<TransfersPage />} />
          <Route path="/entrainement" element={<TrainingPage />} />
          <Route path="/courses" element={<RacesPage />} />
          <Route path="/todo" element={<TodoPage />} />
          <Route path="/parametres" element={<SettingsPage />} />
          <Route path="/calendrier" element={<CalendarPage />} />
          <Route path="/resultats" element={<ResultPage />} />
          <Route path="/classement" element={<RankingPage />} />
          <Route path="/statistiques" element={<StatisticsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/planification" element={<MultiSeasonPlanningPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}