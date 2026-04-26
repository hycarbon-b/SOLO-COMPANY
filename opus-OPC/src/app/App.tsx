import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { StudioPage } from './pages/StudioPage';
import { LibraryPage } from './pages/LibraryPage';
import { DistributePage } from './pages/DistributePage';
import { SchedulePage } from './pages/SchedulePage';
import { StreamingPage } from './pages/StreamingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AgentsPage } from './pages/AgentsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="studio" element={<StudioPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="distribute" element={<DistributePage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="streaming" element={<StreamingPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
