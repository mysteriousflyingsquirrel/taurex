import type { ReactNode } from "react";

interface StickyFormFooterProps {
  dirty?: boolean;
  left?: ReactNode;
  right: ReactNode;
}

export default function StickyFormFooter({ dirty, left, right }: StickyFormFooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white md:left-64">
      <div className="flex items-center justify-between px-6 py-3 md:px-8">
        <div>{left}</div>
        <div className="flex items-center gap-4">
          {dirty && (
            <span className="text-sm text-amber-600">Unsaved changes</span>
          )}
          {right}
        </div>
      </div>
    </div>
  );
}
