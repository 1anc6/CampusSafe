import { getSql } from "@/backend/db";
import { audit } from "@/backend/core/helpers";
import { REDACTED_REPORTER } from "@/lib/access";
import { PHOTO_KEEP_DAYS } from "@/lib/photos";

/** Days a resolved/closed report keeps its reporter and photo. */
export function retentionDays(): number {
  const n = Number(process.env.RETENTION_DAYS);
  return Number.isInteger(n) && n >= 30 ? n : 365;
}

/**
 * Delete every photo whose report was sent more than PHOTO_KEEP_DAYS ago, on
 * signed-in and anonymous reports alike, open or closed. Only the images go:
 * the report itself (what happened, where, when, the thread) is untouched.
 */
export async function purgeOldPhotos(): Promise<number> {
  const sql = await getSql();
  const keep = PHOTO_KEEP_DAYS;
  const incident = await sql<{ id: string }>`
    delete from incident_photos
    where incident_id in (
      select id from incidents where created_at < now() - make_interval(days => ${keep})
    )
    returning incident_id as id
  `;
  // Photos from before migration 0010 lived on the incident row itself.
  const legacy = await sql<{ id: string }>`
    update incidents set photo_data = null
    where photo_data is not null and created_at < now() - make_interval(days => ${keep})
    returning id
  `;
  const anonymous = await sql<{ id: string }>`
    delete from anonymous_report_photos
    where report_id in (
      select id from anonymous_reports where created_at < now() - make_interval(days => ${keep})
    )
    returning report_id as id
  `;
  return incident.length + legacy.length + anonymous.length;
}

/**
 * De-identify reports that have been resolved or closed for longer than the
 * retention period: the photo is deleted, the link to the student's account is
 * cut, and the anonymous tracking thread and photos are deleted. What happened, where and
 * when stays, so campus statistics and hotspot maps keep working.
 */
export async function purgeExpiredReports(): Promise<{
  incidents: number;
  anonymous: number;
  photos: number;
}> {
  const photos = await purgeOldPhotos();
  const sql = await getSql();
  const days = retentionDays();
  const expired = await sql<{ id: string }>`
    select id from incidents
    where status in ('resolved', 'closed') and redacted_at is null
      and updated_at < now() - make_interval(days => ${days})
    limit 500
  `;
  const ids = expired.map((r) => r.id);
  if (ids.length) {
    await sql`delete from incident_photos where incident_id = any(${ids}::text[])`;
    await sql`
      update incidents
      set user_id = ${REDACTED_REPORTER}, photo_data = null, redacted_at = now()
      where id = any(${ids}::text[])
    `;
  }
  // Anonymous reports carry no identity, but their replies and photos can: clear old threads…
  const anon = await sql<{ id: string }>`
    delete from threads
    where kind = 'anonymous' and author_role <> 'system' and subject_id in (
      select id from anonymous_reports
      where status in ('resolved', 'closed') and updated_at < now() - make_interval(days => ${days})
    )
    returning subject_id as id
  `;
  // …and their photos go too.
  const anonPhotos = await sql<{ id: string }>`
    delete from anonymous_report_photos
    where report_id in (
      select id from anonymous_reports
      where status in ('resolved', 'closed') and updated_at < now() - make_interval(days => ${days})
    )
    returning report_id as id
  `;
  const anonCount = new Set([...anon, ...anonPhotos].map((r) => r.id)).size;
  if (ids.length || anonCount || photos) {
    await audit(
      null,
      "retention.purge",
      undefined,
      undefined,
      `${ids.length} incidents, ${anonCount} anonymous, ${photos} photos`,
    );
  }
  return { incidents: ids.length, anonymous: anonCount, photos };
}
