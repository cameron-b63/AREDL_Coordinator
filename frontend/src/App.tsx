import { useAuth } from './hooks/useAuth';
import { useUserPreferences } from './hooks/useUserPreferences';
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
  const auth = useAuth();
  const prefs = useUserPreferences(auth.user, auth.setUser);

  if (isAdminRoute()) {
    return <AdminPortal auth={auth} />;
  }

  if (isSettingsRoute()) {
    return <SettingsPage auth={auth} prefs={prefs} />;
  }

  return <BoardPage auth={auth} prefs={prefs} />;
}
