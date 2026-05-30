import { useState } from 'preact/hooks';
import { ExternalLinkIcon } from '../ui/ExternalLinkIcon';
import { ApiError, fetchShowcaseVideo } from '../../lib/api';
import type { BoardLevel } from '../../lib/types/board';

interface LevelCardShowcaseProps {
  level: BoardLevel;
}

export function LevelCardShowcase({ level }: LevelCardShowcaseProps) {
  const [loading, setLoading] = useState(false);
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openShowcase() {
    if (cachedUrl) {
      window.open(cachedUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { videoUrl } = await fetchShowcaseVideo(level.id);
      setCachedUrl(videoUrl);
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 404
          ? 'No showcase video'
          : 'Could not load video';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const label = loading ? 'Loading…' : error ? 'Retry' : 'Showcase';

  return (
    <div class="level-card-showcase">
      <button
        type="button"
        class="level-card-showcase__button"
        disabled={loading}
        title={error ?? 'Watch the official level showcase'}
        onClick={openShowcase}
      >
        <span>{label}</span>
        <ExternalLinkIcon />
      </button>
      {error && !loading ? (
        <span class="level-card-showcase__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
