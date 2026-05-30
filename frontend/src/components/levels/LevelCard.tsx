import { useState } from 'preact/hooks';
import { copyToClipboard, isFinePointerDevice } from '../../lib/copyToClipboard';
import { ApiError, adminResetClaim } from '../../lib/api';
import type { BoardLevel } from '../../lib/types/board';
import { levelIsCompleted } from '../../lib/types/board';
import {
  claimKindLabel,
  claimStrengthClass,
  isClaimKind,
} from '../../lib/types/claim';
import type { ClaimMutationResponse } from '../../lib/types/claimMutation';
import type { User } from '../../lib/types/user';
import { AssigneeBubble } from './AssigneeBubble';
import { ClaimMenu } from './ClaimMenu';
import { LevelCardActions } from './LevelCardActions';
import { LevelCardShowcase } from './LevelCardShowcase';

interface LevelCardProps {
  level: BoardLevel;
  user: User | null;
  signedIn: boolean;
  onClaimChange: (result: ClaimMutationResponse) => void;
}

export function LevelCard({ level, user, signedIn, onClaimChange }: LevelCardProps) {
  const completed = levelIsCompleted(level);
  const activeClaim = level.claim.active;
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);

  let verb = 'Completed';
  let username = 'Nobody Yet';
  let avatarUrl: string | null = null;
  let showCompletedStyle = completed;
  let strengthClass: string | undefined;

  if (completed) {
    username = level.completion.by?.username ?? 'Nobody Yet';
    avatarUrl = level.completion.by?.avatarUrl ?? null;
  } else if (activeClaim) {
    verb = claimKindLabel(activeClaim.kind);
    username = activeClaim.claimedBy.username;
    avatarUrl = activeClaim.claimedBy.avatarUrl;
    showCompletedStyle = false;
    if (isClaimKind(activeClaim.kind)) {
      strengthClass = claimStrengthClass(activeClaim.kind);
    }
  }

  async function handleCopyId() {
    if (!isFinePointerDevice()) return;
    const ok = await copyToClipboard(String(level.gameLevelId));
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  async function handleAdminReset() {
    if (!user?.isAdmin || resetting) return;
    const confirmed = window.confirm(
      `Hard reset the claim on "${level.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      const result = await adminResetClaim(level.id);
      onClaimChange(result);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Failed to reset claim';
      window.alert(message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <article class={`level-card${completed ? ' level-card--completed' : ''}`}>
      {user?.isAdmin ? (
        <button
          type="button"
          class="level-card__admin-reset"
          title="Hard reset claim (admin)"
          aria-label="Hard reset claim"
          disabled={resetting}
          onClick={handleAdminReset}
        >
          ↺
        </button>
      ) : null}
      <div class="level-card__info">
        <h2 class="level-card__title">
          <span class="level-card__rank">#{level.position}</span>
          <span class="level-card__dash"> - </span>
          <span class="level-card__name">{level.name}</span>
          <span class="level-card__meta">
            <button
              type="button"
              class="level-card__id"
              title={copied ? 'Copied!' : `Copy level ID ${level.gameLevelId}`}
              onClick={handleCopyId}
            >
              ({level.gameLevelId})
            </button>
            <LevelCardShowcase level={level} />
          </span>
        </h2>
        <AssigneeBubble
          verb={verb}
          username={username}
          avatarUrl={avatarUrl}
          completed={showCompletedStyle}
          strengthClass={strengthClass}
          showAvatar={completed || activeClaim !== null}
        />
      </div>
      <div class="level-card__aside">
        {completed ? (
          <LevelCardActions level={level} />
        ) : (
          <ClaimMenu
            level={level}
            user={user}
            signedIn={signedIn}
            menuEnabled={level.claim.menuEnabled}
            activeClaim={activeClaim}
            onClaimChange={onClaimChange}
          />
        )}
      </div>
    </article>
  );
}
