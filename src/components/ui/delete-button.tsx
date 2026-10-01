'use client';

import { useState } from 'react';

export function DeleteButton({
  onDelete,
  label = 'Delete',
  confirmText = 'Delete this item? This cannot be undone.',
}: {
  onDelete: () => Promise<void>;
  label?: string;
  confirmText?: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className="row-delete"
      title={label}
      aria-label={label}
      disabled={busy}
      onClick={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!window.confirm(confirmText)) return;
        setBusy(true);
        try {
          await onDelete();
        } finally {
          setBusy(false);
        }
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      </svg>
    </button>
  );
}
