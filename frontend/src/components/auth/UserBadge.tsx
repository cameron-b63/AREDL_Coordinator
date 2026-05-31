import { useEffect, useRef, useState } from 'preact/hooks';
import { signOutUrl } from '../../lib/api';
import { clearSessionToken } from '../../lib/session';
import type { User } from '../../lib/types/user';

interface UserBadgeProps {
  user: User;
}

function settingsPath(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/settings`;
}

export function UserBadge({ user }: UserBadgeProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initials = user.username.slice(0, 1).toUpperCase();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div class="user-badge" ref={rootRef}>
      <button
        type="button"
        class="user-badge__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span class="user-badge__name">{user.username}</span>
        <span class="user-badge__avatar-wrap">
          {user.avatarUrl ? (
            <img class="user-badge__avatar" src={user.avatarUrl} alt="" />
          ) : (
            <span class="user-badge__avatar user-badge__avatar--fallback">{initials}</span>
          )}
        </span>
      </button>
      {open ? (
        <div class="user-badge__menu" role="menu">
          <a class="user-badge__menu-item" href={settingsPath()} role="menuitem">
            Settings
          </a>
          <a
            class="user-badge__menu-item"
            href={signOutUrl()}
            role="menuitem"
            onClick={() => clearSessionToken()}
          >
            Sign out
          </a>
        </div>
      ) : null}
    </div>
  );
}
