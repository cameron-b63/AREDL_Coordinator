import { useEffect, useState } from 'preact/hooks';
import { fetchMe } from '../lib/api';
import { consumeSessionFromUrl } from '../lib/session';
import type { User } from '../lib/types/user';

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

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

  return { user, loading: user === undefined };
}
