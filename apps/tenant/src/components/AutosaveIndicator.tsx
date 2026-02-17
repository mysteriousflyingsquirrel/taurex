interface AutosaveIndicatorProps {
  saving: boolean;
  saved: boolean;
  error: string | null;
}

export default function AutosaveIndicator({
  saving,
  saved,
  error,
}: AutosaveIndicatorProps) {
  if (error) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Save failed
      </span>
    );
  }

  if (saving) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        Saving…
      </span>
    );
  }

  if (saved) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Saved
      </span>
    );
  }

  return null;
}
