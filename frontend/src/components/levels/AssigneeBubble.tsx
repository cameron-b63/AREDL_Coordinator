interface AssigneeBubbleProps {
  /** Status verb, e.g. "Completed", "Claimed", "Supposedly Completed". */
  verb: string;
  username: string;
  avatarUrl: string | null;
  completed: boolean;
  strengthClass?: string;
  showAvatar?: boolean;
  onUsernameSearch?: (username: string) => void;
}

export function AssigneeBubble({
  verb,
  username,
  avatarUrl,
  completed,
  strengthClass,
  showAvatar = completed,
  onUsernameSearch,
}: AssigneeBubbleProps) {
  const isUnknownAssignee = username === 'Nobody Yet';
  const isSearchable = !isUnknownAssignee && onUsernameSearch !== undefined;
  const initials = username.slice(0, 1).toUpperCase();
  const bubbleClass = [
    'assignee-bubble',
    completed ? 'assignee-bubble--completed' : '',
    showAvatar ? 'assignee-bubble--has-avatar' : '',
    strengthClass ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const pillContent = <span class="assignee-bubble__name">{username}</span>;

  return (
    <div class="assignee-status" title={`${verb} By: ${username}`}>
      <span class="assignee-status__label">{verb} By:</span>
      <div class={bubbleClass}>
        {isSearchable ? (
          <button
            type="button"
            class="assignee-bubble__pill assignee-bubble__pill--clickable"
            aria-label={`Search levels for @${username}`}
            onClick={() => onUsernameSearch(username)}
          >
            {pillContent}
          </button>
        ) : (
          <div class="assignee-bubble__pill">{pillContent}</div>
        )}
        {showAvatar ? (
          <span class="assignee-bubble__avatar-wrap">
            {avatarUrl ? (
              <img class="assignee-bubble__avatar" src={avatarUrl} alt="" />
            ) : isUnknownAssignee ? (
              <span
                class="assignee-bubble__avatar assignee-bubble__avatar--placeholder"
                aria-hidden="true"
              >
                ?
              </span>
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
