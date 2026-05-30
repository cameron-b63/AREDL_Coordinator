interface AssigneeBubbleProps {
  /** Status verb, e.g. "Completed", "Claimed" (claims later). */
  verb: string;
  username: string;
  avatarUrl: string | null;
  completed: boolean;
}

export function AssigneeBubble({
  verb,
  username,
  avatarUrl,
  completed,
}: AssigneeBubbleProps) {
  const initials = username.slice(0, 1).toUpperCase();

  return (
    <div
      class="assignee-status"
      title={`${verb} By: ${username}`}
    >
      <span class="assignee-status__label">{verb} By:</span>
      <div
        class={`assignee-bubble${completed ? ' assignee-bubble--completed' : ''}`}
      >
        <div class="assignee-bubble__pill">
          <span class="assignee-bubble__name">{username}</span>
        </div>
        {completed && (
          <span class="assignee-bubble__avatar-wrap">
            {avatarUrl ? (
              <img class="assignee-bubble__avatar" src={avatarUrl} alt="" />
            ) : (
              <span class="assignee-bubble__avatar assignee-bubble__avatar--fallback">
                {initials}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
