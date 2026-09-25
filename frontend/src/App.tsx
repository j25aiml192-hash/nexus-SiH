import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { TopBar } from './components/nexus/TopBar';
import { DashboardPage } from './pages/DashboardPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { ComplaintDetailPage } from './pages/ComplaintDetailPage';
import { PredictionResultsPage } from './pages/PredictionResultsPage';
import { MapPage } from './pages/MapPage';
import { AlertsPage } from './pages/AlertsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { NetworkGraphPage } from './pages/NetworkGraphPage';
import { useNexusStore } from './store/useNexusStore';
import { NexusAnimatedBackground } from './components/nexus/NexusAnimatedBackground';

export function App() {
  const isSidebarCollapsed = useNexusStore((state) => state.isSidebarCollapsed);

  return (
    <BrowserRouter>
      <AppContent isSidebarCollapsed={isSidebarCollapsed} />
    </BrowserRouter>
  );
}

function AppContent({ isSidebarCollapsed }: { isSidebarCollapsed: boolean }) {
  const location = useLocation();
  const isMapPage = location.pathname === '/map';

  return (
    <div className="nexus-app-container">
      <NexusAnimatedBackground />
      <Navigation />
      <div className={`nexus-main-wrapper ${isSidebarCollapsed ? 'collapsed-sidebar' : ''}`}>
        <TopBar />
        <main className={`nexus-main-content ${isMapPage ? 'is-map-page' : ''}`}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/complaints" element={<ComplaintsPage />} />
            <Route path="/complaints/:complaintId" element={<ComplaintDetailPage />} />
            <Route path="/complaints/:complaintId/network" element={<NetworkGraphPage />} />
            <Route path="/network" element={<Navigate to="/complaints/CMP-2026-9081/network" replace />} />
            <Route path="/prediction/:complaintId" element={<PredictionResultsPage />} />
            <Route path="/prediction" element={<Navigate to="/prediction/CMP-2026-9081" replace />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/incidents/:id" element={<IncidentDetailPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
