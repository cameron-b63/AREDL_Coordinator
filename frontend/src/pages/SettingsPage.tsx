import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { SignInButton } from '../components/auth/SignInButton';
import { UserBadge } from '../components/auth/UserBadge';
import { deleteManualHardest, fetchLevels, putManualHardest } from '../lib/api';
import { resolveLevelNameByPosition } from '../lib/levelLookup';
import { useAuth } from '../hooks/useAuth';
import type { Level } from '../lib/types/level';
import type { UserHardest } from '../lib/types/user';

const LOOKUP_DEBOUNCE_MS = 300;

function boardPath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
}

function settingsHardestLabel(hardest: UserHardest | null): string {
  if (!hardest) return 'Not set';
  return `#${hardest.position} ${hardest.levelName}`;
}

export function SettingsPage() {
  const { user, refresh, setUser } = useAuth();
  const [levels, setLevels] = useState<Level[] | null>(null);
  const [positionInput, setPositionInput] = useState('');
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lookupTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLevels()
      .then((data) => {
        if (!cancelled) setLevels(data);
      })
      .catch(() => {
        if (!cancelled) setLevels([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const parsedPosition = (() => {
    const trimmed = positionInput.trim();
    if (!trimmed) return null;
    const value = Number.parseInt(trimmed, 10);
    return Number.isFinite(value) && value >= 1 ? value : null;
  })();

  useEffect(() => {
    if (lookupTimerRef.current != null) {
      window.clearTimeout(lookupTimerRef.current);
    }
    if (parsedPosition == null) {
      setPreviewName(null);
      return;
    }
    lookupTimerRef.current = window.setTimeout(() => {
      setPreviewName(resolveLevelNameByPosition(levels, parsedPosition));
    }, LOOKUP_DEBOUNCE_MS);
    return () => {
      if (lookupTimerRef.current != null) {
        window.clearTimeout(lookupTimerRef.current);
      }
    };
  }, [parsedPosition, levels]);

  const handleConfirm = useCallback(async () => {
    if (parsedPosition == null) {
      setError('Enter a valid placement number.');
      return;
    }
    if (!previewName) {
      setError('No level found at that placement.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await putManualHardest(parsedPosition);
      setUser(updated);
      setPositionInput('');
      setPreviewName(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save hardest.');
    } finally {
      setSaving(false);
    }
  }, [parsedPosition, previewName, setUser]);

  const handleClearOverride = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await deleteManualHardest();
      setUser(updated);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear override.');
    } finally {
      setSaving(false);
    }
  }, [refresh, setUser]);

  const signedIn = user !== null && user !== undefined;

  return (
    <div class="settings-page">
      <header class="settings-page__header">
        <a class="settings-page__back" href={boardPath()}>
          ← Board
        </a>
        <h1 class="settings-page__title">Settings</h1>
        <div class="settings-page__auth">
          {user === undefined ? (
            <span aria-hidden="true">…</span>
          ) : user ? (
            <UserBadge user={user} />
          ) : (
            <SignInButton />
          )}
        </div>
      </header>

      <main class="settings-page__main">
        {!signedIn ? (
          <p class="settings-page__message">Sign in to set your hardest and save filter preferences.</p>
        ) : (
          <section class="settings-page__section">
            <h2 class="settings-page__section-title">Hardest level</h2>
            <p class="settings-page__hint">
              Used by <strong>Exclude New Hardests</strong> when your AREDL profile is missing or
              out of date. Marking a harder level as <strong>Supposedly Completed</strong> updates
              this automatically.
            </p>

            <dl class="settings-page__stats">
              <div class="settings-page__stat">
                <dt>Current hardest</dt>
                <dd>{settingsHardestLabel(user.hardest)}</dd>
              </div>
              <div class="settings-page__stat">
                <dt>AREDL profile</dt>
                <dd>{settingsHardestLabel(user.aredlHardest)}</dd>
              </div>
              {user.manualHardest ? (
                <div class="settings-page__stat">
                  <dt>Manual override</dt>
                  <dd>{settingsHardestLabel(user.manualHardest)}</dd>
                </div>
              ) : null}
            </dl>

            <div class="settings-page__placement">
              <label class="settings-page__field">
                <span class="settings-page__field-label">Placement #</span>
                <input
                  class="settings-page__input"
                  type="number"
                  min={1}
                  value={positionInput}
                  onInput={(event) =>
                    setPositionInput((event.currentTarget as HTMLInputElement).value)
                  }
                  placeholder="e.g. 42"
                />
              </label>
              {parsedPosition != null ? (
                <span class="settings-page__preview" aria-live="polite">
                  #{parsedPosition}
                  {previewName ? ` ${previewName}` : levels === null ? ' …' : ' Unknown placement'}
                </span>
              ) : null}
            </div>

            {error ? <p class="settings-page__error">{error}</p> : null}

            <div class="settings-page__actions">
              <button
                type="button"
                class="settings-page__btn settings-page__btn--primary"
                disabled={saving || parsedPosition == null || !previewName}
                onClick={handleConfirm}
              >
                Confirm
              </button>
              {user.manualHardest ? (
                <button
                  type="button"
                  class="settings-page__btn"
                  disabled={saving}
                  onClick={handleClearOverride}
                >
                  Use AREDL profile
                </button>
              ) : null}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
