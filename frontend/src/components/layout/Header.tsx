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
}

export function Header({
  searchQuery,
  onSearchChange,
  user,
  filtersOpen,
  onToggleFilters,
  statsOpen,
  onToggleStats,
}: HeaderProps) {
  const showStats = user !== null && user !== undefined;

  return (
    <div class="header">
      {showStats ? (
        <StatsMenuButton active={statsOpen} onClick={onToggleStats} />
      ) : (
        <span class="header__menu-spacer" aria-hidden="true" />
      )}
      <h1 class="header__brand">
        <span class="header__nsh">NSH</span>
        <span class="header__title">Beats the AREDL</span>
      </h1>
      <SearchBar value={searchQuery} onInput={onSearchChange} />
      <FiltersButton active={filtersOpen} onClick={onToggleFilters} />
      <div class="header__auth">
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
