import { Phone, Siren } from "lucide-react";
import { useViewer } from "@/lib/auth/use-viewer";
import { useSecurityLine } from "@/lib/use-security-line";

/**
 * Shown on the report forms when P1 (immediate danger) is picked: a report is
 * read by command, an SOS reaches them at once with a live location. Students
 * are pointed at the SOS button (always on screen in their shell); everyone
 * else, who has no SOS, at the security line. Red, because this is about SOS.
 */
export function UrgentHelp() {
  const viewer = useViewer();
  const student = viewer?.role === "student";
  const line = useSecurityLine();
  return (
    <div
      className="mt-3 flex items-start gap-3 rounded-xl bg-sos/10 p-3 ring-1 ring-sos/20"
      role="status"
    >
      <Siren className="mt-0.5 size-4 shrink-0 text-sos" aria-hidden="true" />
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-sos">In danger right now?</p>
        <p className="mt-0.5 text-xs text-muted">
          {student
            ? "Don't fill in a form. Hold the red SOS button: command is alerted at once with your live location."
            : "Don't fill in a form. Call campus security now."}
        </p>
        <a
          href={line.tel}
          className="mt-2.5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--neu-surface)] px-4 text-xs font-semibold text-sos shadow-[var(--neu-raised-xs)] transition-shadow hover:shadow-[var(--neu-raised-sm)]"
        >
          <Phone className="size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Call {line.label}{" "}
            <span className="whitespace-nowrap font-mono font-medium">{line.phone}</span>
          </span>
        </a>
        {line.placeholder && (
          <p className="mt-1.5 text-[11px] text-warn">Placeholder number — set the real one.</p>
        )}
      </div>
    </div>
  );
}
