interface AssigneeBubbleProps {
  label: string;
  username: string;
  avatarUrl: string | null;
  completed: boolean;
}

export function AssigneeBubble({
  label,
  username,
  avatarUrl,
  completed,
}: AssigneeBubbleProps) {
  const initials = username.slice(0, 1).toUpperCase();
  const statusText = `${label} By: ${username}`;

  return (
    <div
      class={`assignee-bubble${completed ? ' assignee-bubble--completed' : ''}`}
      title={statusText}
    >
      <span class="assignee-bubble__avatar-wrap">
        {avatarUrl ? (
          <img class="assignee-bubble__avatar" src={avatarUrl} alt="" />
        ) : (
          <span class="assignee-bubble__avatar assignee-bubble__avatar--fallback">
            {initials}
          </span>
        )}
      </span>
      <span class="assignee-bubble__text">{statusText}</span>
    </div>
  );
}
