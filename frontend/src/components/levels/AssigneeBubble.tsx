interface AssigneeBubbleProps {
  /** Status verb, e.g. "Completed", "Claimed", "Supposedly Completed". */
  verb: string;
  username: string;
  avatarUrl: string | null;
  completed: boolean;
  strengthClass?: string;
  showAvatar?: boolean;
}

export function AssigneeBubble({
  verb,
  username,
  avatarUrl,
  completed,
  strengthClass,
  showAvatar = completed,
}: AssigneeBubbleProps) {
  const initials = username.slice(0, 1).toUpperCase();
  const bubbleClass = [
    'assignee-bubble',
    completed ? 'assignee-bubble--completed' : '',
    showAvatar ? 'assignee-bubble--has-avatar' : '',
    strengthClass ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div class="assignee-status" title={`${verb} By: ${username}`}>
      <span class="assignee-status__label">{verb} By:</span>
      <div class={bubbleClass}>
        <div class="assignee-bubble__pill">
          <span class="assignee-bubble__name">{username}</span>
        </div>
        {showAvatar ? (
          <span class="assignee-bubble__avatar-wrap">
            {avatarUrl ? (
              <img class="assignee-bubble__avatar" src={avatarUrl} alt="" />
            ) : (
              <span class="assignee-bubble__avatar assignee-bubble__avatar--fallback">
                {initials}
              </span>
            )}
          </span>
        ) : null}
      </div>
    </div>
  );
}
