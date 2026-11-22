import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Camera,
  Check,
  Copy,
  EyeOff,
  ImagePlus,
  LoaderCircle,
  Lock,
  Search,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { AdaptiveShell } from "@/components/student/student-shell";
import { FormSection } from "@/components/student/form-section";
import { CATEGORIES, LOCATIONS, SEVERITIES, type Severity } from "@/lib/campus";
import { createAnonymous } from "@/backend/functions/reports";
import { cn } from "@/lib/utils";
import { NeuSelect, placeOptions } from "@/components/shared/neu-select";
import {
  ANON_PHOTO_MAX,
  ANON_PHOTO_MAX_CHARS,
  PHOTO_INPUT_MAX_BYTES,
  reencodeImage,
} from "@/lib/photos";

export const Route = createFileRoute("/anonymous")({ component: AnonymousPage });

type Role = "victim" | "witness" | "heard";

const ROLES: [Role, string][] = [
  ["victim", "It happened to me"],
  ["witness", "I saw it"],
  ["heard", "I heard about it"],
];

const PROMISES = [
  "No name or account attached",
  "No IP address or device details stored",
  "Photo location and camera details removed",
  "Command only sees what you send",
  "Follow up with a private tracking code",
];

/** Short versions of the promise for the phone header, where the full card sits far below. */
const PROMISE_CHIPS = ["No name", "No IP or device", "Photo GPS removed"];

const DESCRIPTION_MAX = 2000;

type Photo = { key: number; url: string };

function AnonymousPage() {
  const [categoryId, setCategoryId] = useState<string>(CATEGORIES[0].id);
  const [locationId, setLocationId] = useState<string>(LOCATIONS[0].id);
  const [role, setRole] = useState<Role>("witness");
  const [timeRange, setTimeRange] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("P2");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [preparing, setPreparing] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ code: string; photos: number } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preparing > 0) return;
    if (timeRange.trim().length < 2) {
      setError("Roughly when did it happen? A range is fine.");
      return;
    }
    if (description.trim().length < 8) {
      setError("Please add a short description.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createAnonymous({
        data: {
          categoryId,
          locationId,
          role,
          timeRange: timeRange.trim(),
          description: description.trim(),
          severity,
          photos: photos.map((p) => p.url),
        },
      });
      setSent({ code: res.code, photos: photos.length });
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  const submitProps = { busy, preparing: preparing > 0, error };

  return (
    <AdaptiveShell anon width="wide">
      <header className="mb-6">
        <h1 className="flex items-center gap-2.5 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          <EyeOff className="size-6 shrink-0 text-violet" aria-hidden="true" />
          Anonymous report
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          <strong className="font-semibold text-fg">Your identity is not saved.</strong> Tell campus
          command what happened without revealing who you are. You'll get a private code to follow
          the case.
        </p>
        {!sent && (
          <ul className="mt-3 flex flex-wrap gap-1.5 lg:hidden" aria-label="Privacy">
            {PROMISE_CHIPS.map((p) => (
              <li
                key={p}
                className="inline-flex items-center gap-1 rounded-full bg-violet/15 px-2.5 py-1 text-[11px] font-semibold text-violet"
              >
                <Check className="size-3" aria-hidden="true" /> {p}
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0">
          {sent ? (
            <CodeCard code={sent.code} photos={sent.photos} />
          ) : (
            <form id="anon-form" onSubmit={submit} className="space-y-4" noValidate>
              <FormSection step={1} title="Your connection to it" tone="violet">
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRole(id)}
                      aria-pressed={role === id}
                      className={cn(
                        "min-h-12 rounded-xl px-2 text-xs font-semibold ring-1 transition-colors",
                        role === id
                          ? "text-violet ring-transparent shadow-[var(--neu-inset-sm)]"
                          : "ring-transparent shadow-[var(--neu-raised-xs)] hover:shadow-[var(--neu-raised-sm)]",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </FormSection>

              <FormSection step={2} title="What and where" tone="violet">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="field-label">Category</span>
                    <NeuSelect
                      value={categoryId}
                      onValueChange={setCategoryId}
                      options={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
                    />
                  </label>
                  <label className="block">
                    <span className="field-label">Campus place</span>
                    <NeuSelect
                      value={locationId}
                      onValueChange={setLocationId}
                      options={placeOptions(LOCATIONS)}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="field-label">Roughly when</span>
                    <input
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value)}
                      placeholder="e.g. Last night, 9–11 pm"
                      maxLength={80}
                      className="input"
                    />
                  </label>
                </div>
              </FormSection>

              <FormSection step={3} title="How serious is it?" tone="violet">
                <div className="grid grid-cols-4 gap-2">
                  {SEVERITIES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSeverity(s.id)}
                      aria-pressed={severity === s.id}
                      className={cn(
                        "min-h-14 rounded-xl px-1 text-xs ring-1 transition-colors",
                        severity === s.id
                          ? "text-violet ring-transparent shadow-[var(--neu-inset-sm)]"
                          : "ring-transparent shadow-[var(--neu-raised-xs)] hover:shadow-[var(--neu-raised-sm)]",
                      )}
                    >
                      <span className="block font-bold">{s.id}</span>
                      <span className="block text-[11px] text-muted">{s.label}</span>
                    </button>
                  ))}
                </div>
              </FormSection>

              <FormSection
                step={4}
                title="Describe it"
                hint="Avoid details that could identify you."
                tone="violet"
              >
                <textarea
                  id="anon-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  maxLength={DESCRIPTION_MAX}
                  placeholder="What happened, and anything command should know."
                  className="input min-h-32"
                  aria-label="Description"
                  aria-describedby="anon-description-count"
                />
                <p
                  id="anon-description-count"
                  className={cn(
                    "mt-1.5 text-right text-[11px] tabular-nums",
                    description.length > DESCRIPTION_MAX - 100 ? "text-warn" : "text-dim",
                  )}
                >
                  {description.length} / {DESCRIPTION_MAX}
                </p>
              </FormSection>

              <FormSection
                step={5}
                title="Add photos (optional)"
                hint={`Up to ${ANON_PHOTO_MAX}. Location, time and camera details are removed on your phone before sending.`}
                tone="violet"
              >
                <PhotoPicker
                  photos={photos}
                  setPhotos={setPhotos}
                  preparing={preparing}
                  setPreparing={setPreparing}
                />
              </FormSection>

              {/* Phones / tablets: submit sits under the form. */}
              <div className="lg:hidden">
                <SubmitBlock {...submitProps} />
              </div>
            </form>
          )}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-8">
          {!sent && (
            <div className="card hidden p-4 lg:block">
              <SubmitBlock {...submitProps} formId="anon-form" />
            </div>
          )}
          <div className="card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-violet" /> Our privacy promise
            </h2>
            <ul className="space-y-2">
              {PROMISES.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-muted">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-violet" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <TrackBox />
        </aside>
      </div>
    </AdaptiveShell>
  );
}

/**
 * Pick or take up to ANON_PHOTO_MAX photos. Each is re-encoded through a canvas
 * right away (see `reencodeImage`), so the thumbnail shows exactly what is sent
 * and the original file, with its EXIF/GPS, never leaves the phone.
 */
function PhotoPicker({
  photos,
  setPhotos,
  preparing,
  setPreparing,
}: {
  photos: Photo[];
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  preparing: number;
  setPreparing: React.Dispatch<React.SetStateAction<number>>;
}) {
  const nextKey = useRef(0);
  const [problem, setProblem] = useState<string | null>(null);
  const free = ANON_PHOTO_MAX - photos.length - preparing;
  const full = free <= 0;

  async function addFiles(list: FileList | null, input: HTMLInputElement) {
    const files = Array.from(list ?? []);
    input.value = ""; // so picking the same photo again still fires onChange
    if (files.length === 0) return;
    const take = files.slice(0, Math.max(0, free));
    let issue: string | null =
      files.length > take.length ? `Only ${ANON_PHOTO_MAX} photos can be attached.` : null;
    setPreparing((n) => n + take.length);
    await Promise.all(
      take.map(async (file) => {
        try {
          if (!file.type.startsWith("image/")) throw new Error("That file isn't a photo.");
          if (file.size > PHOTO_INPUT_MAX_BYTES) throw new Error("That photo is over 25 MB.");
          const url = await reencodeImage(file, {
            maxEdge: 1600,
            quality: 0.72,
            maxChars: ANON_PHOTO_MAX_CHARS,
          }).catch(() => {
            throw new Error("A photo couldn't be read. Try a JPG or PNG.");
          });
          const key = nextKey.current++;
          setPhotos((prev) => (prev.length >= ANON_PHOTO_MAX ? prev : [...prev, { key, url }]));
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
              className="grid aspect-square place-items-center rounded-xl text-violet neu-well"
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
          Only campus command can see photos.
        </span>
        <span className="tabular-nums">
          {photos.length} / {ANON_PHOTO_MAX}
        </span>
      </p>
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

function SubmitBlock({
  busy,
  preparing,
  error,
  formId,
}: {
  busy: boolean;
  preparing: boolean;
  error: string | null;
  formId?: string;
}) {
  return (
    <>
      {error && (
        <p
          className="mb-3 rounded-lg bg-sos/10 p-2.5 text-sm text-sos ring-1 ring-sos/30"
          role="alert"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        form={formId}
        disabled={busy || preparing}
        className="btn-neon min-h-12 w-full"
      >
        {busy || preparing ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {busy ? "Sending…" : preparing ? "Preparing photos…" : "Send anonymously"}
      </button>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-dim">
        <Lock className="size-3" /> Sent without your name or account
      </p>
    </>
  );
}

function CodeCard({ code, photos }: { code: string; photos: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card flex flex-col items-center px-5 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-violet/15 text-violet">
        <ShieldCheck className="size-6" />
      </span>
      <p className="mt-4 font-display text-xl font-semibold">Report sent anonymously</p>
      {photos > 0 && (
        <p className="mt-1 text-sm text-muted">
          {photos === 1 ? "1 photo" : `${photos} photos`} attached, with location and camera details
          removed.
        </p>
      )}
      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted">
        Your private tracking code
      </p>
      <div className="mt-2 flex items-center gap-2">
        <p className="select-all break-all font-mono text-2xl font-semibold tracking-wide text-violet sm:text-3xl">
          {code}
        </p>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(() => setCopied(true));
          }}
          className="grid size-10 place-items-center rounded-lg text-muted neu-raised-xs hover:text-fg"
          aria-label="Copy tracking code"
        >
          {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
        </button>
      </div>
      <p className="mt-4 max-w-sm text-sm text-muted">
        Save this now — it is the only way to follow your report, and we can't show it again.
      </p>
      <Link to="/track/$code" params={{ code }} className="btn-neon mt-8 w-full sm:w-auto sm:px-8">
        Open tracker
      </Link>
    </div>
  );
}

/** Look up an earlier anonymous report by its tracking code. */
function TrackBox() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const cleaned = value.trim().toUpperCase();
  return (
    <form
      className="card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (cleaned.length >= 6) void navigate({ to: "/track/$code", params: { code: cleaned } });
      }}
    >
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <Search className="size-4 text-violet" /> Track a report
      </h2>
      <p className="mb-3 text-xs text-muted">Enter the code you saved when you reported.</p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="CS-XXXX-XXXX"
          autoCapitalize="characters"
          spellCheck={false}
          className="input flex-1 font-mono uppercase"
          aria-label="Tracking code"
        />
        <button
          type="submit"
          disabled={cleaned.length < 6}
          className="btn-ghost px-3"
          aria-label="Track"
        >
          <Search className="size-4" />
        </button>
      </div>
    </form>
  );
}
