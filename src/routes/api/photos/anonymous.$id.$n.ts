import { createFileRoute } from "@tanstack/react-router";

/**
 * `GET /api/photos/anonymous/$id/$n` — photo number `n` (0-based) on an
 * anonymous report. Anonymous reports are command-only, so only admins get it.
 * The reporter has no account and cannot fetch it back; nothing here can lead to
 * them. Private browser caching only, so a shared proxy never keeps a copy.
 */
export const Route = createFileRoute("/api/photos/anonymous/$id/$n")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { requireUserId } = await import("@/lib/auth/verify.server");
        const { getSql } = await import("@/backend/db");
        const { getOrCreateProfile } = await import("@/backend/core/helpers");
        let userId: string;
        try {
          userId = await requireUserId();
        } catch {
          return new Response("Unauthorized", { status: 401 });
        }
        const profile = await getOrCreateProfile(userId);
        if (profile.role !== "admin") return new Response("Not found", { status: 404 });
        const position = Number(params.n);
        if (!Number.isInteger(position) || position < 0 || position > 2) {
          return new Response("Not found", { status: 404 });
        }
        const sql = await getSql();
        const rows = await sql<{ mime: string; data: Uint8Array }>`
          select mime, data from anonymous_report_photos
          where report_id = ${params.id} and position = ${position}
        `;
        const photo = rows[0];
        if (!photo) return new Response("Not found", { status: 404 });
        return new Response(new Uint8Array(photo.data), {
          headers: {
            "Content-Type": photo.mime,
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
