import { AdminPortal } from './pages/AdminPortal';
import { BoardPage } from './pages/BoardPage';
import { SettingsPage } from './pages/SettingsPage';

function normalizedPath(): string {
  return location.pathname.replace(/\/$/, '');
}

function isAdminRoute(): boolean {
  return normalizedPath().endsWith('/admin');
}

function isSettingsRoute(): boolean {
  return normalizedPath().endsWith('/settings');
}

export function App() {
  if (isAdminRoute()) {
    return <AdminPortal />;
  }

  if (isSettingsRoute()) {
    return <SettingsPage />;
  }

  return <BoardPage />;
}
