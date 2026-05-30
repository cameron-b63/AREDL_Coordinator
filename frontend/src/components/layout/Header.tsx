import { SignInButton } from '../auth/SignInButton';
import { UserBadge } from '../auth/UserBadge';
import { FiltersButton } from '../ui/FiltersButton';
import { SearchBar } from '../ui/SearchBar';
import { StatsMenuButton } from '../ui/StatsMenuButton';
import type { User } from '../../lib/types/user';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  user: User | null | undefined;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  statsOpen: boolean;
  onToggleStats: () => void;
  adminPage?: boolean;
}

function adminPath(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/admin`;
}

export function Header({
  searchQuery,
  onSearchChange,
  user,
  filtersOpen,
  onToggleFilters,
  statsOpen,
  onToggleStats,
  adminPage = false,
}: HeaderProps) {
  const showStats = !adminPage && user !== null && user !== undefined;

  return (
    <div class="header">
      <div class="header__edge header__edge--start">
        {showStats ? (
          <StatsMenuButton active={statsOpen} onClick={onToggleStats} />
        ) : null}
      </div>
      <div class="header__center">
        <h1 class="header__brand">
          <span class="header__nsh">NSH</span>
          <span class="header__title">Beats the AREDL</span>
        </h1>
        {!adminPage ? (
          <>
            <SearchBar value={searchQuery} onInput={onSearchChange} />
            <FiltersButton active={filtersOpen} onClick={onToggleFilters} />
          </>
        ) : null}
      </div>
      <div class="header__edge header__edge--end">
        {user?.isAdmin ? (
          adminPage ? (
            <span class="header__admin-label">Admin Portal</span>
          ) : (
            <a class="header__admin-link" href={adminPath()}>
              Admin
            </a>
          )
        ) : null}
        {user === undefined ? (
          <span class="header__auth-loading" aria-hidden="true">
            …
          </span>
        ) : user ? (
          <UserBadge user={user} />
        ) : (
          <SignInButton />
        )}
      </div>
    </div>
  );
}
