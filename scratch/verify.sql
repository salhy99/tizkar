WITH table_checks AS (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
),
trigger_checks AS (
  SELECT trigger_name, event_object_table, action_statement
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
),
constraint_checks AS (
  SELECT conname
  FROM pg_constraint
  WHERE conrelid = 'invitation_versions'::regclass
),
index_checks AS (
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'payments'
),
policy_checks AS (
  SELECT tablename, policyname, cmd
  FROM pg_policies
  WHERE schemaname = 'public'
),
seed_checks AS (
  SELECT 
    (SELECT count(*) FROM event_types) AS event_types_count,
    (SELECT count(*) FROM plans) AS plans_count,
    (SELECT count(*) FROM templates) AS templates_count,
    (SELECT count(*) FROM template_versions) AS template_versions_count
)
SELECT 
  (SELECT json_agg(table_name) FROM table_checks) AS tables,
  (SELECT json_agg(json_build_object('name', trigger_name, 'table', event_object_table)) FROM trigger_checks) AS triggers,
  (SELECT json_agg(conname) FROM constraint_checks) AS constraints,
  (SELECT json_agg(indexdef) FROM index_checks) AS indexes,
  (SELECT json_agg(json_build_object('table', tablename, 'policy', policyname, 'cmd', cmd)) FROM policy_checks) AS policies,
  (SELECT row_to_json(seed_checks) FROM seed_checks) AS seed_counts;
