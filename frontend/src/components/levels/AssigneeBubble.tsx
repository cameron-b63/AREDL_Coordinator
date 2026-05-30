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
      class={`assignee-bubble${completed ? ' assignee-bubble--completed' : ''}`}
      title={`${verb} By: ${username}`}
    >
      <span class="assignee-bubble__prefix">{verb} By:</span>
      {completed &&
        (avatarUrl ? (
          <img class="assignee-bubble__avatar" src={avatarUrl} alt="" />
        ) : (
          <span class="assignee-bubble__avatar assignee-bubble__avatar--fallback">
            {initials}
          </span>
        ))}
      <span class="assignee-bubble__username">{username}</span>
    </div>
  );
}
