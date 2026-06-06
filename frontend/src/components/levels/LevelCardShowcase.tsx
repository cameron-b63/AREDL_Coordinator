import { useState } from 'preact/hooks';
import { VideoIcon } from '../ui/VideoIcon';
import { ApiError, fetchShowcaseVideo } from '../../lib/api';
import type { BoardLevel } from '../../lib/types/board';

interface LevelCardShowcaseProps {
  level: BoardLevel;
}

export function LevelCardShowcase({ level }: LevelCardShowcaseProps) {
  const [loading, setLoading] = useState(false);
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openShowcase(event: Event) {
    event.preventDefault();
    event.stopPropagation();

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

  const title = loading
    ? 'Loading showcase…'
    : error
      ? `${error} — click to retry`
      : 'Open level showcase video';

  if (cachedUrl) {
    return (
      <a
        class="level-card__showcase"
        href={cachedUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Open level showcase video"
        aria-label="Open level showcase video"
        onClick={(e) => e.stopPropagation()}
      >
        <VideoIcon />
      </a>
    );
  }

  return (
    <button
      type="button"
      class="level-card__showcase"
      disabled={loading}
      title={title}
      aria-label={title}
      onClick={openShowcase}
    >
      <VideoIcon />
    </button>
  );
}
