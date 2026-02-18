interface DiscardChangesModalProps {
  open: boolean;
  onCancel: () => void;
  onDiscard: () => void;
}

export default function DiscardChangesModal({ open, onCancel, onDiscard }: DiscardChangesModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">Discard changes?</h2>
        <p className="mt-2 text-sm text-gray-600">You have unsaved changes.</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onDiscard}
            className="inline-flex h-10 items-center rounded-lg border border-red-600 bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
