import { SignInButton } from '../auth/SignInButton';
import { UserBadge } from '../auth/UserBadge';
import { SearchBar } from '../ui/SearchBar';
import type { User } from '../../lib/types/user';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  user: User | null | undefined;
}

export function Header({ searchQuery, onSearchChange, user }: HeaderProps) {
  return (
    <div class="header">
      <div class="header__brand">
        <span class="header__logo">AREDL</span>
        <span class="header__subtitle">Coordinator</span>
      </div>
      <SearchBar value={searchQuery} onInput={onSearchChange} />
      <div class="header__auth">
        {user ? <UserBadge user={user} /> : <SignInButton />}
      </div>
    </div>
  );
}
