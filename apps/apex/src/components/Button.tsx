import type { ReactNode, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "destructive";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const base = "inline-flex items-center justify-center rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-amber-500 text-gray-900 hover:bg-amber-400 focus:ring-amber-500 border border-amber-500",
  secondary: "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 focus:ring-amber-500",
  destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border border-red-600",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm min-h-[36px]",
  md: "h-10 px-4 text-sm min-h-[40px]",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}
