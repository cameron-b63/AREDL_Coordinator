import type { User } from '../../lib/types/user';

interface UserBadgeProps {
  user: User;
}

export function UserBadge({ user }: UserBadgeProps) {
  const initials = user.username.slice(0, 1).toUpperCase();

  return (
    <div class="user-badge">
      {user.avatarUrl ? (
        <img class="user-badge__avatar" src={user.avatarUrl} alt="" />
      ) : (
        <span class="user-badge__avatar user-badge__avatar--fallback">{initials}</span>
      )}
      <span class="user-badge__name">{user.username}</span>
    </div>
  );
}
