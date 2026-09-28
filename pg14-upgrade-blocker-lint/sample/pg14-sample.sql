-- ops/backup_and_monitoring.sql : helpers still written for PostgreSQL 14
SELECT pg_start_backup('nightly', true);
SELECT pg_stop_backup();

CREATE EXTENSION IF NOT EXISTS adminpack;

CREATE FUNCTION slugify(t text) RETURNS text AS $$
  return t.lower().replace(' ', '-')
$$ LANGUAGE plpythonu;

CREATE VIEW checkpoint_health AS
  SELECT checkpoints_timed, now() AS sampled_at FROM pg_stat_bgwriter;

ALTER SYSTEM SET vacuum_defer_cleanup_age = 10000;
