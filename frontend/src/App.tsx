import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { TopBar } from './components/nexus/TopBar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { ComplaintDetailPage } from './pages/ComplaintDetailPage';
import { PredictionResultsPage } from './pages/PredictionResultsPage';
import { MapPage } from './pages/MapPage';
import { AlertsPage } from './pages/AlertsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { NetworkGraphPage } from './pages/NetworkGraphPage';
import { SaiFloatingButton } from './components/nexus/SaiFloatingButton';
import { useNexusStore } from './store/useNexusStore';
import { PageTransition } from './components/ui/PageTransition';

export function App() {
  const isSidebarCollapsed = useNexusStore((state) => state.isSidebarCollapsed);
  const isSidebarHovered = useNexusStore((state) => state.isSidebarHovered);
  const isVisuallyCollapsed = isSidebarCollapsed && !isSidebarHovered;

  return (
    <BrowserRouter>
      <AppContent isSidebarCollapsed={isVisuallyCollapsed} />
    </BrowserRouter>
  );
}

function AppContent({ isSidebarCollapsed }: { isSidebarCollapsed: boolean }) {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isLoginPage = location.pathname === '/login';
  const isMapPage = location.pathname === '/map';

  // Public routes (Landing Page & Login Page) do not require authentication guard.
  // Private application routes are guarded by ProtectedRoute inside Routes.

  if (isLoginPage) {
    return (
      <PageTransition>
        <LoginPage />
      </PageTransition>
    );
  }

  if (isLandingPage) {
    return (
      <PageTransition>
        <LandingPage />
      </PageTransition>
    );
  }

  return (
    <div className="nexus-app-container">
      <Navigation />
      <div className={`nexus-main-wrapper ${isSidebarCollapsed ? 'collapsed-sidebar' : ''}`}>
        <TopBar />
        <main className={`nexus-main-content ${isMapPage ? 'is-map-page' : ''}`}>
          <PageTransition>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Application Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/complaints" element={<ComplaintsPage />} />
                <Route path="/complaints/:complaintId" element={<ComplaintDetailPage />} />
                <Route path="/complaints/:complaintId/network" element={<NetworkGraphPage />} />
                <Route path="/network" element={<Navigate to="/complaints" replace />} />
                <Route path="/prediction/:complaintId" element={<PredictionResultsPage />} />
                <Route path="/prediction" element={<Navigate to="/complaints" replace />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/incidents" element={<IncidentsPage />} />
                <Route path="/incidents/:id" element={<IncidentDetailPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PageTransition>
        </main>
      </div>
      {!isLandingPage && !isLoginPage && <SaiFloatingButton />}
    </div>
  );
}

export default App;
