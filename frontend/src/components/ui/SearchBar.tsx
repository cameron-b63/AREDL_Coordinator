interface SearchBarProps {
  value: string;
  onInput: (value: string) => void;
}

export function SearchBar({ value, onInput }: SearchBarProps) {
  return (
    <label class="search-bar">
      <span class="search-bar__icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.5" />
          <path d="M13.5 13.5L17 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </span>
      <input
        class="search-bar__input"
        type="search"
        placeholder="Search by name, rank, or @username…"
        value={value}
        onInput={(event) => onInput((event.currentTarget as HTMLInputElement).value)}
      />
    </label>
  );
}
