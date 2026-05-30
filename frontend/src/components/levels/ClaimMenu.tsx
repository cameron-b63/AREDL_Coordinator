import { useState } from 'preact/hooks';
import {
  CLAIM_OPTIONS,
  type ClaimKind,
} from '../../lib/types/claim';

interface ClaimMenuProps {
  signedIn: boolean;
}

export function ClaimMenu({ signedIn }: ClaimMenuProps) {
  const [selection, setSelection] = useState<ClaimKind>('claimed');
  const disabled = !signedIn;
  const hint = signedIn ? 'Coming soon' : 'Sign in to claim';

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
      <button class="claim-menu__submit" type="button" disabled={disabled} title={hint}>
        Submit
      </button>
    </div>
  );
}
