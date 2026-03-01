import { useRef, useState, type ChangeEvent } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  uploadApartmentImage,
  removeApartmentImage,
  updateApartment,
  type ApartmentImage,
} from "@taurex/firebase";
import { useToast } from "./Toast";

interface ApartmentImageManagerProps {
  hostId: string;
  slug: string;
  images: ApartmentImage[];
  onImagesChange: (images: ApartmentImage[]) => void;
}

const MAX_IMAGES = 15;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
  "image/x-heic",
  "image/x-heif",
]);
const ACCEPTED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
]);
const ACCEPT_STRING = "image/*";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extensionFromName(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "";
  return name.slice(dot + 1).toLowerCase();
}

function isAcceptedImage(file: File): boolean {
  if (file.type && ACCEPTED_MIME_TYPES.has(file.type.toLowerCase())) return true;
  const ext = extensionFromName(file.name);
  return ACCEPTED_EXTENSIONS.has(ext);
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return "Unknown error";
}

/**
 * Extract the storage filename from a Firebase download URL.
 * URLs look like: https://…/images%2F{hostId}%2F{slug}%2F{filename}?alt=media&token=…
 */
function filenameFromUrl(url: string): string | null {
  try {
    const decoded = decodeURIComponent(new URL(url).pathname);
    const last = decoded.split("/").pop();
    return last ?? null;
  } catch {
    return null;
  }
}

export default function ApartmentImageManager({
  hostId,
  slug,
  images,
  onImagesChange,
}: ApartmentImageManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const [removingIdx, setRemovingIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null);
  const toast = useToast();

  const isFull = images.length >= MAX_IMAGES;

  const reportValidationError = (message: string) => {
    setError(message);
    toast.error(message);
  };

  const persistImages = async (next: ApartmentImage[]) => {
    await updateApartment(hostId, slug, { images: next });
    onImagesChange(next);
  };

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    e.target.value = "";
    setError(null);

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      reportValidationError(`Maximum of ${MAX_IMAGES} images reached.`);
      return;
    }
    const selected = picked.slice(0, remaining);

    const invalid = selected.find((f) => !isAcceptedImage(f));
    if (invalid) {
      reportValidationError(
        `"${invalid.name}" is not a supported format. Use JPEG, PNG, WebP, HEIC, or HEIF.`,
      );
      return;
    }

    const tooLarge = selected.find((f) => f.size > MAX_FILE_SIZE);
    if (tooLarge) {
      reportValidationError(
        `"${tooLarge.name}" is too large (${formatSize(tooLarge.size)}). Maximum is ${formatSize(MAX_FILE_SIZE)}.`,
      );
      return;
    }

    const ids = new Set(selected.map((f) => f.name));
    setUploading(ids);

    let current = [...images];

    for (const file of selected) {
      try {
        const img = await uploadApartmentImage(hostId, slug, file);
        current = [...current, img];
        await persistImages(current);
      } catch (err) {
        const message = getErrorMessage(err);
        // Keep full runtime context in devtools for debugging.
        console.error(`Failed to upload "${file.name}"`, err);
        setError(`Failed to upload "${file.name}": ${message}`);
        toast.error(`Upload failed: ${message}`);
      }
    }

    setUploading(new Set());
  };

  const handleRemove = async (idx: number) => {
    setError(null);
    setRemovingIdx(idx);

    const img = images[idx];
    const filename = filenameFromUrl(img.src);

    try {
      if (filename) {
        await removeApartmentImage(hostId, slug, filename);
      }
      const next = images.filter((_, i) => i !== idx);
      await persistImages(next);
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to remove image", err);
      setError(`Failed to remove image: ${message}`);
      toast.error(`Remove failed: ${message}`);
    } finally {
      setRemovingIdx(null);
    }
  };

  const uploadCount = uploading.size;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setJustDroppedId(String(active.id));
    requestAnimationFrame(() => setJustDroppedId(null));

    const oldIndex = images.findIndex((img) => img.src === String(active.id));
    const newIndex = images.findIndex((img) => img.src === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(images, oldIndex, newIndex);
    // Optimistic reorder prevents visual snap-back while waiting for Firestore.
    onImagesChange(next);
    try {
      await updateApartment(hostId, slug, { images: next });
    } catch (err) {
      const message = getErrorMessage(err);
      onImagesChange(images);
      setError(`Failed to reorder images: ${message}`);
      toast.error(`Reorder failed: ${message}`);
    }
  };

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          void handleDragEnd(event);
        }}
      >
        <SortableContext
          items={images.map((img) => img.src)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((img, i) => (
              <SortableImageTile
                key={img.src}
                id={img.src}
                image={img}
                onRemove={() => {
                  void handleRemove(i);
                }}
                removing={removingIdx === i}
                removeDisabled={removingIdx !== null}
                dragDisabled={removingIdx !== null || uploadCount > 0}
                disableReleaseAnimation={justDroppedId === img.src}
              />
            ))}

            {uploadCount > 0 &&
              Array.from({ length: uploadCount }).map((_, i) => (
                <div
                  key={`uploading-${i}`}
                  className="flex aspect-[4/3] items-center justify-center rounded-lg border border-border bg-surface-alt"
                >
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ))}

            {!isFull && uploadCount === 0 && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-surface-alt text-muted transition hover:border-primary hover:text-primary"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-xs font-medium">Add images</span>
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_STRING}
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      <p className="mt-2 text-xs text-muted">
        {images.length}/{MAX_IMAGES} images. Drag and drop to reorder. JPEG, PNG, WebP, HEIC, or HEIF, max {formatSize(MAX_FILE_SIZE)} each.
      </p>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function SortableImageTile({
  id,
  image,
  onRemove,
  removing,
  removeDisabled,
  dragDisabled,
  disableReleaseAnimation,
}: {
  id: string;
  image: ApartmentImage;
  onRemove: () => void;
  removing: boolean;
  removeDisabled: boolean;
  dragDisabled: boolean;
  disableReleaseAnimation: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: dragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: disableReleaseAnimation ? "none" : transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-alt ${isDragging ? "ring-2 ring-primary" : ""}`}
    >
      <img
        src={image.src}
        alt={image.alt || ""}
        className="h-full w-full object-cover"
      />

      <button
        type="button"
        disabled={dragDisabled}
        {...attributes}
        {...listeners}
        className="absolute left-1.5 top-1.5 flex h-7 w-7 cursor-grab items-center justify-center rounded-full bg-surface/90 text-foreground shadow opacity-0 transition hover:bg-surface group-hover:opacity-100 active:cursor-grabbing disabled:cursor-not-allowed"
        aria-label="Drag to reorder image"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h.01M8 12h.01M8 17h.01M16 7h.01M16 12h.01M16 17h.01" />
        </svg>
      </button>

      <button
        type="button"
        disabled={removeDisabled}
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 text-foreground shadow opacity-0 transition hover:bg-destructive hover:text-white group-hover:opacity-100"
        aria-label="Remove image"
      >
        {removing ? (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
    </div>
  );
}
