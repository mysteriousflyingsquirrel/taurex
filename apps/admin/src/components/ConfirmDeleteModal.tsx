import { useState, useEffect } from "react";

interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmPhrase: string;
  buttonLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmPhrase,
  buttonLabel,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDeleteModalProps) {
  const [typed, setTyped] = useState("");

  // Reset input when modal opens/closes
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  if (!open) return null;

  const matches = typed === confirmPhrase;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        {/* Warning header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-5 w-5 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          </div>
        </div>

        {/* Confirmation input */}
        <div className="mt-6">
          <p className="text-sm text-gray-700">
            To confirm, type{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-semibold text-red-600">
              {confirmPhrase}
            </code>{" "}
            below:
          </p>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmPhrase}
            autoFocus
            className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!matches || loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Deleting…" : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
