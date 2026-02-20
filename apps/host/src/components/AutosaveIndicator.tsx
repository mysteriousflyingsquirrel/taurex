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
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive">
        <span className="h-2 w-2 rounded-full bg-destructive" />
        Save failed
      </span>
    );
  }

  if (saving) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted">
        <span className="h-2 w-2 animate-pulse rounded-full bg-warning" />
        Saving…
      </span>
    );
  }

  if (saved) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
        <span className="h-2 w-2 rounded-full bg-success" />
        Saved
      </span>
    );
  }

  return null;
}
