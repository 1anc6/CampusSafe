import { Camera, ImagePlus, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  PHOTO_INPUT_MAX_BYTES,
  PHOTO_KEEP_NOTE,
  PHOTO_MAX,
  PHOTO_MAX_CHARS,
  PHOTO_MAX_EDGE,
  PHOTO_QUALITY,
  reencodeImage,
} from "@/lib/photos";
import { cn } from "@/lib/utils";

export type PickedPhoto = { key: number; url: string };

/**
 * Take or choose up to PHOTO_MAX photos for a report. Each is re-encoded
 * through a canvas right away (see `reencodeImage`), so the thumbnail shows
 * exactly what is sent and the original file, with its EXIF/GPS, never leaves
 * the phone. `preparing` counts photos still being processed, so the form can
 * hold its submit button until they are ready.
 */
export function PhotoPicker({
  photos,
  setPhotos,
  preparing,
  setPreparing,
  note,
}: {
  photos: PickedPhoto[];
  setPhotos: React.Dispatch<React.SetStateAction<PickedPhoto[]>>;
  preparing: number;
  setPreparing: React.Dispatch<React.SetStateAction<number>>;
  /** Who will see the photos, shown under the buttons. */
  note: string;
}) {
  const nextKey = useRef(0);
  const [problem, setProblem] = useState<string | null>(null);
  const free = PHOTO_MAX - photos.length - preparing;
  const full = free <= 0;

  async function addFiles(list: FileList | null, input: HTMLInputElement) {
    const files = Array.from(list ?? []);
    input.value = ""; // so picking the same photo again still fires onChange
    if (files.length === 0) return;
    const take = files.slice(0, Math.max(0, free));
    let issue: string | null =
      files.length > take.length ? `Only ${PHOTO_MAX} photos can be attached.` : null;
    setPreparing((n) => n + take.length);
    await Promise.all(
      take.map(async (file) => {
        try {
          if (!file.type.startsWith("image/")) throw new Error("That file isn't a photo.");
          if (file.size > PHOTO_INPUT_MAX_BYTES) throw new Error("That photo is over 25 MB.");
          const url = await reencodeImage(file, {
            maxEdge: PHOTO_MAX_EDGE,
            quality: PHOTO_QUALITY,
            maxChars: PHOTO_MAX_CHARS,
          }).catch(() => {
            throw new Error("A photo couldn't be read. Try a JPG or PNG.");
          });
          const key = nextKey.current++;
          setPhotos((prev) => (prev.length >= PHOTO_MAX ? prev : [...prev, { key, url }]));
        } catch (err) {
          issue = err instanceof Error ? err.message : "A photo couldn't be added.";
        } finally {
          setPreparing((n) => n - 1);
        }
      }),
    );
    setProblem(issue);
  }

  return (
    <div>
      {(photos.length > 0 || preparing > 0) && (
        <ul className="mb-3 grid grid-cols-3 gap-2.5" aria-label="Photos to send">
          {photos.map((p, i) => (
            <li key={p.key} className="relative">
              <img
                src={p.url}
                alt={`Photo ${i + 1} to send`}
                className="aspect-square w-full rounded-xl object-cover neu-raised-xs"
              />
              <button
                type="button"
                onClick={() => {
                  setPhotos((prev) => prev.filter((x) => x.key !== p.key));
                  setProblem(null);
                }}
                className="absolute -right-1.5 -top-1.5 grid size-10 place-items-center rounded-full"
                aria-label={`Remove photo ${i + 1}`}
              >
                <span className="grid size-7 place-items-center rounded-full bg-[var(--neu-surface)] text-fg shadow-[var(--neu-raised-xs)]">
                  <X className="size-4" aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
          {Array.from({ length: preparing }, (_, i) => (
            <li
              key={`preparing-${i}`}
              className="grid aspect-square place-items-center rounded-xl text-neon neu-well"
            >
              <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
              <span className="sr-only">Removing photo details…</span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <PickButton icon={Camera} label="Take photo" disabled={full} capture onFiles={addFiles} />
        <PickButton icon={ImagePlus} label="Choose photos" disabled={full} onFiles={addFiles} />
      </div>
      <p
        className="mt-2 flex items-center justify-between gap-2 text-[11px] text-dim"
        aria-live="polite"
      >
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3 shrink-0" aria-hidden="true" />
          {note}
        </span>
        <span className="shrink-0 tabular-nums">
          {photos.length} / {PHOTO_MAX}
        </span>
      </p>
      <p className="mt-1 text-[11px] text-dim">{PHOTO_KEEP_NOTE}</p>
      {problem && (
        <p className="mt-2 text-xs text-warn" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}

function PickButton({
  icon: Icon,
  label,
  disabled,
  capture,
  onFiles,
}: {
  icon: typeof Camera;
  label: string;
  disabled: boolean;
  capture?: boolean;
  onFiles: (files: FileList | null, input: HTMLInputElement) => void;
}) {
  return (
    <label
      className={cn(
        "btn-ghost min-h-12 cursor-pointer text-xs has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-neon",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
      <input
        type="file"
        accept="image/*"
        // The rear camera on phones; desktops ignore it and open the file picker.
        capture={capture ? "environment" : undefined}
        multiple={!capture}
        disabled={disabled}
        onChange={(e) => onFiles(e.target.files, e.target)}
        className="sr-only"
      />
    </label>
  );
}

/** Attached photos on a case: thumbnails that open full size in a new tab. */
export function PhotoGrid({ urls, note }: { urls: string[]; note?: string }) {
  if (urls.length === 0) return null;
  return (
    <div>
      <ul
        className={cn(
          "grid gap-3",
          urls.length === 1 ? "grid-cols-1" : urls.length === 2 ? "grid-cols-2" : "grid-cols-3",
        )}
      >
        {urls.map((url, n) => (
          <li key={url}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-xl neu-raised-xs"
              aria-label={`Open photo ${n + 1} of ${urls.length} full size`}
            >
              <img
                src={url}
                alt={`Photo ${n + 1} attached to the report`}
                loading="lazy"
                className={cn(
                  "w-full object-cover",
                  urls.length === 1 ? "max-h-72" : "aspect-[4/3]",
                )}
              />
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-dim">
        {note ? `${note} ` : ""}
        {PHOTO_KEEP_NOTE}
      </p>
    </div>
  );
}
