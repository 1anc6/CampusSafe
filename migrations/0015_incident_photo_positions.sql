-- Up to 3 photos per incident (was one). Existing photos become position 0, so
-- an older deploy that inserts without a position and reads "the" photo by
-- incident id keeps working during a rollout.
alter table incident_photos add column if not exists position smallint not null default 0;
alter table incident_photos drop constraint if exists incident_photos_position_check;
alter table incident_photos
  add constraint incident_photos_position_check check (position between 0 and 2);
alter table incident_photos drop constraint if exists incident_photos_pkey;
alter table incident_photos add primary key (incident_id, position);
