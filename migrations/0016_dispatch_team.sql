-- The dispatch list is the campus team only: the three seeded units (their
-- real names and numbers come from RESPONDER_NAMES / RESPONDER_PHONES on the
-- host) plus any responder accounts. Remove the unused Fire & Rescue unit and
-- the units that admin accounts used to get, unless one still holds a live SOS.
-- Alerts and incidents that pointed at a removed unit become unassigned
-- (their foreign keys are "on delete set null").
delete from responders where id = 'fire' and active_sos = 0;

delete from responders r
using profiles p
where r.id = 'self-' || p.user_id
  and p.role <> 'responder'
  and r.active_sos = 0;
