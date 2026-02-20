"use client";

interface GuestStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
}

export default function GuestStepper({ value, onChange, min = 1, max = 20, label }: GuestStepperProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center rounded-lg border border-input bg-surface">
        <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="flex h-9 w-9 items-center justify-center text-muted transition hover:text-foreground disabled:text-muted" aria-label="Decrease guests">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
        </button>
        <span className="w-8 text-center text-sm font-semibold text-foreground">{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="flex h-9 w-9 items-center justify-center text-muted transition hover:text-foreground disabled:text-muted" aria-label="Increase guests">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>
    </div>
  );
}
