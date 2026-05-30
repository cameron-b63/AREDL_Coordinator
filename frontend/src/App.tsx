import { AdminPortal } from './pages/AdminPortal';
import { BoardPage } from './pages/BoardPage';

function isAdminRoute(): boolean {
  return location.pathname.replace(/\/$/, '').endsWith('/admin');
}

export function App() {
  if (isAdminRoute()) {
    return <AdminPortal />;
  }

  return <BoardPage />;
}
