-- Photos on anonymous reports (up to 3 each).
-- The browser re-encodes every photo through a canvas and the server strips any
-- remaining JPEG metadata (src/lib/jpeg-metadata.ts), so no EXIF/GPS/camera data
-- is stored. On purpose there is no uploader, device or timestamp column: a row
-- says nothing beyond which report it belongs to. Served only to command through
-- the signed-in /api/photos/anonymous/$id/$n route.
create table if not exists anonymous_report_photos (
  report_id text not null references anonymous_reports (id) on delete cascade,
  position smallint not null check (position between 0 and 2),
  mime text not null check (mime = 'image/jpeg'),
  data bytea not null,
  primary key (report_id, position)
);
