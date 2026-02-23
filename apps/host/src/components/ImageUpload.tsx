import { useRef, useState, type ChangeEvent } from "react";
import Button from "./Button";

interface ImageUploadProps {
  currentUrl?: string;
  accept: string;
  maxWidth: number;
  maxHeight: number;
  maxSizeBytes: number;
  label: string;
  previewClass?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateImageDimensions(
  file: File,
  maxW: number,
  maxH: number,
): Promise<void> {
  if (file.type === "image/svg+xml") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (img.width > maxW || img.height > maxH) {
        reject(new Error(`Image must be at most ${maxW}×${maxH}px (got ${img.width}×${img.height})`));
      } else {
        resolve();
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Could not read image file"));
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function ImageUpload({
  currentUrl,
  accept,
  maxWidth,
  maxHeight,
  maxSizeBytes,
  label,
  previewClass = "h-20 w-20 rounded-lg object-contain",
  onUpload,
  onRemove,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so re-selecting the same file triggers change
    e.target.value = "";

    setError(null);

    if (file.size > maxSizeBytes) {
      setError(`File too large (${formatSize(file.size)}). Maximum is ${formatSize(maxSizeBytes)}.`);
      return;
    }

    try {
      await validateImageDimensions(file, maxWidth, maxHeight);
    } catch (err) {
      setError((err as Error).message);
      return;
    }

    setUploading(true);
    try {
      await onUpload(file);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    setRemoving(true);
    try {
      await onRemove();
    } catch {
      setError("Remove failed. Please try again.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      <p className="mb-3 text-xs text-muted">
        Max {maxWidth}×{maxHeight}px, {formatSize(maxSizeBytes)}
      </p>

      <div className="flex items-center gap-4">
        {currentUrl ? (
          <img src={currentUrl} alt={label} className={previewClass} />
        ) : (
          <div className={`${previewClass} flex items-center justify-center border-2 border-dashed border-border bg-surface-alt`}>
            <svg className="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleChange}
          />
          <Button
            variant="secondary"
            size="sm"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {currentUrl ? "Replace" : "Upload"}
          </Button>
          {currentUrl && (
            <Button
              variant="destructive"
              size="sm"
              loading={removing}
              onClick={handleRemove}
            >
              Remove
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
