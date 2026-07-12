/*
# Planora: projects, tasks, and events schema

1. Overview
Planora is a single-tenant planning app (no sign-in). It lets a user organize
work into projects, break projects into tasks with a kanban-style status, and
track scheduled events on a calendar. All data is intentionally shared/public
within this single-tenant app, so policies allow anon + authenticated CRUD.

2. New Tables
- `projects`
  - id (uuid, primary key)
  - name (text, not null)
  - description (text, nullable)
  - color (text, default 'emerald') — used to tint project chips in the UI
  - due_date (date, nullable)
  - archived (boolean, default false)
  - created_at (timestamptz, default now())
- `tasks`
  - id (uuid, primary key)
  - project_id (uuid, references projects, cascade delete)
  - title (text, not null)
  - description (text, nullable)
  - status (text, default 'todo') — one of 'todo','in_progress','done'
  - priority (text, default 'medium') — one of 'low','medium','high'
  - due_date (date, nullable)
  - position (integer, default 0) — for ordering within a status column
  - created_at (timestamptz, default now())
- `events`
  - id (uuid, primary key)
  - title (text, not null)
  - description (text, nullable)
  - start_at (timestamptz, not null)
  - end_at (timestamptz, not null)
  - color (text, default 'sky')
  - created_at (timestamptz, default now())

3. Indexes
- tasks.project_id for fast per-project task loads
- tasks.status for board column queries
- tasks.due_date for upcoming/deadline views
- events.start_at for calendar range queries

4. Security
- RLS enabled on all three tables.
- Policies allow anon + authenticated full CRUD because this is a single-tenant
  app with intentionally shared/public data (no sign-in screen).

5. Notes
- No user_id columns and no auth.uid() checks — the app has no sign-in flow.
- All timestamps are timestamptz with sensible defaults.
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT 'emerald',
  due_date date,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  color text NOT NULL DEFAULT 'sky',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_events" ON events;
CREATE POLICY "anon_insert_events" ON events FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_events" ON events;
CREATE POLICY "anon_update_events" ON events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_events" ON events;
CREATE POLICY "anon_delete_events" ON events FOR DELETE
  TO anon, authenticated USING (true);