interface DiscardChangesModalProps {
  open: boolean;
  onCancel: () => void;
  onDiscard: () => void;
}

export default function DiscardChangesModal({ open, onCancel, onDiscard }: DiscardChangesModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-bold text-foreground">Discard changes?</h2>
        <p className="mt-2 text-sm text-muted">You have unsaved changes.</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="inline-flex h-10 items-center rounded-lg border border-input bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-alt"
          >
            Cancel
          </button>
          <button
            onClick={onDiscard}
            className="inline-flex h-10 items-center rounded-lg border border-destructive bg-destructive px-4 text-sm font-semibold text-primary-fg hover:bg-destructive/90"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
