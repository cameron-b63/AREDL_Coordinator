import { useState } from 'preact/hooks';
import { adminExecuteClaimsSql, ApiError, type ClaimsSqlResult } from '../../lib/api';

const DEFAULT_SQL = `SELECT c.id, c.level_id, c.priority, c.user_id, u.username
FROM claims c
JOIN users u ON u.id = c.user_id
LIMIT 50`;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function SqlBrowserConfirm({
  onYes,
  onNo,
}: {
  onYes: () => void;
  onNo: () => void;
}) {
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onNo();
    }
  }

  return (
    <div
      class="sql-browser-confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sql-browser-confirm-title"
      onKeyDown={handleKeyDown}
    >
      <div class="sql-browser-confirm__panel">
        <h2 id="sql-browser-confirm-title" class="sql-browser-confirm__warning">
          WARNING
        </h2>
        <div class="sql-browser-confirm__body">
          <p>You are now directly interacting with the underlying database.</p>
          <p>Your actions have consequences.</p>
          <p>There are no second chances.</p>
        </div>
        <p class="sql-browser-confirm__proceed">Proceed?</p>
        <div class="sql-browser-confirm__actions">
          <button type="button" class="sql-browser-confirm__btn sql-browser-confirm__btn--yes" onClick={onYes}>
            YES
          </button>
          <button
            type="button"
            class="sql-browser-confirm__btn sql-browser-confirm__btn--no"
            onClick={onNo}
            autofocus
          >
            NO
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClaimsSqlBrowser() {
  const [unlocked, setUnlocked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ClaimsSqlResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleConfirmYes() {
    setUnlocked(true);
    setConfirmOpen(false);
  }

  function handleConfirmNo() {
    setConfirmOpen(false);
  }

  async function handleRun() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const response = await adminExecuteClaimsSql(sql);
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to execute SQL');
    } finally {
      setRunning(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (unlocked && !running) void handleRun();
    }
  }

  if (!unlocked) {
    return (
      <>
        {confirmOpen ? (
          <SqlBrowserConfirm onYes={handleConfirmYes} onNo={handleConfirmNo} />
        ) : null}
        <div class="admin-portal__sql-gate">
          <p class="admin-portal__sql-warning">
            Run read-only or mutating SQL against the <code>claims</code> table. SELECT may JOIN{' '}
            <code>users</code> for context. Misuse can corrupt live board data.
          </p>
          <button type="button" class="admin-portal__sql-gate-btn" onClick={() => setConfirmOpen(true)}>
            Open SQL browser
          </button>
        </div>
      </>
    );
  }

  return (
    <div class="admin-portal__sql">
      <details class="admin-portal__sql-schema">
        <summary class="admin-portal__sql-schema-summary">Schema reference</summary>
        <pre class="admin-portal__sql-schema-body">
          {`claims(
  id, user_id, level_id, priority, created_at, updated_at
)
priority IN (
  'begrudgingly_earmarked',
  'claimed',
  'locked_down',
  'supposedly_completed'
)`}
        </pre>
      </details>

      <label class="admin-portal__sql-label" for="claims-sql-input">
        SQL
      </label>
      <textarea
        id="claims-sql-input"
        class="admin-portal__sql-input"
        value={sql}
        onInput={(event) => setSql((event.currentTarget as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
        rows={8}
        spellcheck={false}
      />

      <div class="admin-portal__sql-actions">
        <button
          type="button"
          class="admin-portal__action"
          disabled={running}
          onClick={() => void handleRun()}
        >
          {running ? 'Running…' : 'Run'}
        </button>
        <span class="admin-portal__sql-hint">Ctrl+Enter to run</span>
      </div>

      {error ? <p class="admin-portal__error">{error}</p> : null}

      {result?.kind === 'mutation' ? (
        <p class="admin-portal__success">
          {result.changes} row{result.changes === 1 ? '' : 's'} affected.
        </p>
      ) : null}

      {result?.kind === 'query' ? (
        <div class="admin-portal__sql-results">
          <p class="admin-portal__sql-meta">
            {result.rowCount} row{result.rowCount === 1 ? '' : 's'}
            {result.truncated ? ' (showing first 1000)' : ''}
          </p>
          {result.rows.length === 0 ? (
            <p class="admin-portal__message">No rows returned.</p>
          ) : (
            <div class="admin-portal__sql-table-wrap">
              <table class="admin-portal__sql-table">
                <thead>
                  <tr>
                    {result.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, index) => (
                    <tr key={index}>
                      {result.columns.map((col) => (
                        <td key={col}>{formatCell(row[col])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
