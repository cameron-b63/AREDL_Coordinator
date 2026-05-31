import { useCallback, useEffect, useState } from 'preact/hooks';
import { fetchMe } from '../lib/api';
import { consumeSessionFromUrl } from '../lib/session';
import type { User, UserClaim } from '../lib/types/user';

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

  return { user, loading: user === undefined, refresh, setClaims, setUser: setUserProfile };
}
