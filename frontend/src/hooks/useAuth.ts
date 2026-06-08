import { useCallback, useEffect, useState } from 'preact/hooks';
import { fetchMe } from '../lib/api';
import { consumeSessionFromUrl } from '../lib/session';
import type { User, UserClaim, UserHardest } from '../lib/types/user';

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const profile = await fetchMe();
      setUser(profile);
      return profile;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const setClaims = useCallback((claims: UserClaim[]) => {
    setUser((current) => {
      if (!current) return current;
      return { ...current, claims };
    });
  }, []);

  const patchHardest = useCallback(
    (update: { hardest?: UserHardest | null; manualHardest?: UserHardest | null }) => {
      setUser((current) => {
        if (!current) return current;
        return {
          ...current,
          ...(update.hardest !== undefined ? { hardest: update.hardest } : {}),
          ...(update.manualHardest !== undefined
            ? { manualHardest: update.manualHardest }
            : {}),
        };
      });
    },
    [],
  );

  const setUserProfile = useCallback((next: User) => {
    setUser(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      consumeSessionFromUrl();

      try {
        const profile = await fetchMe();
        if (!cancelled) setUser(profile);
      } catch {
        if (!cancelled) setUser(null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  return { user, loading: user === undefined, refresh, setClaims, patchHardest, setUser: setUserProfile };
}

export type AuthHandle = ReturnType<typeof useAuth>;
