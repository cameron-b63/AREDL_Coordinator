import { adminPath } from '../../lib/paths';
import { DISCORD_GUILD_ICON_URL } from '../../lib/site';
import type { User } from '../../lib/types/user';
import { SignInButton } from '../auth/SignInButton';
import { UserBadge } from '../auth/UserBadge';
import { FiltersButton } from '../ui/FiltersButton';
import { RandomLevelButton } from '../ui/RandomLevelButton';
import { SearchBar } from '../ui/SearchBar';
import { StatsMenuButton } from '../ui/StatsMenuButton';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  randomLevelDisabled: boolean;
  onRandomLevelPick: () => void;
  user: User | null | undefined;
  filtersOpen: boolean;
  filtersActive: boolean;
  onToggleFilters: () => void;
  statsOpen: boolean;
  onToggleStats: () => void;
  adminPage?: boolean;
}

export function Header({
  searchQuery,
  onSearchChange,
  randomLevelDisabled,
  onRandomLevelPick,
  user,
  filtersOpen,
  filtersActive,
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
        ) : !adminPage ? (
          <span class="header__stats-spacer" aria-hidden="true" />
        ) : null}
      </div>
      <div class={`header__center${adminPage ? ' header__center--admin' : ''}`}>
        <h1 class="header__brand">
          <img
            class="header__guild-icon"
            src={DISCORD_GUILD_ICON_URL}
            alt=""
          />
          <span class="header__brand-text">
            <span class="header__nsh">NSH</span>
            <span class="header__title">Beats the AREDL</span>
          </span>
        </h1>
        {!adminPage ? (
          <>
            <div class="header__search-group">
              <SearchBar value={searchQuery} onInput={onSearchChange} />
              <RandomLevelButton
                disabled={randomLevelDisabled}
                onPick={onRandomLevelPick}
              />
            </div>
            <FiltersButton
              active={filtersOpen || filtersActive}
              onClick={onToggleFilters}
            />
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
