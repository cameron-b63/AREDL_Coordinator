import { useState } from 'preact/hooks';
import {
  CLAIM_OPTIONS,
  type ClaimKind,
} from '../../lib/types/claim';

interface ClaimMenuProps {
  disabled?: boolean;
}

export function ClaimMenu({ disabled = true }: ClaimMenuProps) {
  const [selection, setSelection] = useState<ClaimKind>('claimed');

  return (
    <div class="claim-menu">
      <label class="claim-menu__field">
        <span class="claim-menu__label">Claim</span>
        <select
          class="claim-menu__select"
          value={selection}
          disabled={disabled}
          onChange={(event) =>
            setSelection((event.currentTarget as HTMLSelectElement).value as ClaimKind)
          }
        >
          {CLAIM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button class="claim-menu__submit" type="button" disabled={disabled} title="Coming soon">
        Submit
      </button>
    </div>
  );
}
