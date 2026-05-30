import { useEffect, useState } from 'preact/hooks';
import { ApiError, removeClaim, submitClaim } from '../../lib/api';
import type { ActiveClaim, BoardLevel } from '../../lib/types/board';
import {
  CLAIM_OPTIONS,
  canSetClaimKind,
  isClaimKind,
  type ClaimKind,
} from '../../lib/types/claim';
import type { ClaimMutationResponse } from '../../lib/types/claimMutation';
import type { User } from '../../lib/types/user';
import { userClaimForLevel, userHasClaimOnLevel } from '../../lib/types/user';

interface ClaimMenuProps {
  level: BoardLevel;
  user: User | null;
  signedIn: boolean;
  menuEnabled: boolean;
  activeClaim: ActiveClaim | null;
  onClaimChange: (result: ClaimMutationResponse) => void;
}

export function ClaimMenu({
  level,
  user,
  signedIn,
  menuEnabled,
  activeClaim,
  onClaimChange,
}: ClaimMenuProps) {
  const ownKind = user ? userClaimForLevel(user, level.id) : null;
  const dominantKind =
    activeClaim && isClaimKind(activeClaim.kind) ? activeClaim.kind : null;

  const [selection, setSelection] = useState<ClaimKind>(ownKind ?? 'claimed');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelection(ownKind ?? 'claimed');
  }, [ownKind, level.id]);

  const disabled = !signedIn || !menuEnabled || submitting;
  const hint = !menuEnabled
    ? 'Level already completed'
    : signedIn
      ? 'Stake claim'
      : 'Sign in to claim';

  const hasOwnClaim = signedIn && user !== null && userHasClaimOnLevel(user, level.id);
  const showRemoveClaim = hasOwnClaim && menuEnabled;

  async function handleSubmit() {
    if (disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitClaim(level.id, selection);
      onClaimChange(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    if (!showRemoveClaim || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await removeClaim(level.id);
      onClaimChange(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove claim');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div class={`claim-menu${!menuEnabled ? ' claim-menu--disabled' : ''}`}>
      <div class="claim-menu__controls">
        <label class="claim-menu__field">
          <span class="claim-menu__label">Claim</span>
          <select
            class="claim-menu__select"
            value={selection}
            disabled={disabled}
            onChange={(event) =>
              setSelection((event.currentTarget as HTMLSelectElement).value as ClaimKind)
            }
          >
            {CLAIM_OPTIONS.map((option) => {
              const allowed = canSetClaimKind(ownKind, option.value, dominantKind);
              return (
                <option key={option.value} value={option.value} disabled={!allowed}>
                  {option.label}
                </option>
              );
            })}
          </select>
        </label>
        <button
          class="claim-menu__submit"
          type="button"
          disabled={disabled || !canSetClaimKind(ownKind, selection, dominantKind)}
          title={hint}
          onClick={handleSubmit}
        >
          {submitting ? '…' : 'STAKE'}
        </button>
      </div>
      {showRemoveClaim ? (
        <button
          class="claim-menu__remove"
          type="button"
          disabled={submitting}
          onClick={handleRemove}
        >
          Remove Claim
        </button>
      ) : null}
      {error ? <p class="claim-menu__error">{error}</p> : null}
    </div>
  );
}
