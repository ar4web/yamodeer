CREATE TABLE IF NOT EXISTS workhub_demo_workspaces (
  demo_role TEXT PRIMARY KEY CHECK (demo_role IN ('SUPER_ADMIN', 'ADMIN', 'HR_OPS', 'MANAGER', 'EMPLOYEE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workhub_tasks (
  demo_role TEXT NOT NULL REFERENCES workhub_demo_workspaces(demo_role) ON DELETE CASCADE,
  id TEXT NOT NULL,
  title JSONB NOT NULL,
  description JSONB NOT NULL,
  due_at TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  status TEXT NOT NULL CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (demo_role, id)
);
CREATE INDEX IF NOT EXISTS workhub_tasks_role_due_idx ON workhub_tasks (demo_role, due_at);

CREATE TABLE IF NOT EXISTS workhub_reminders (
  demo_role TEXT NOT NULL REFERENCES workhub_demo_workspaces(demo_role) ON DELETE CASCADE,
  id TEXT NOT NULL,
  title JSONB NOT NULL,
  details JSONB NOT NULL,
  due_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'DONE')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (demo_role, id)
);
CREATE INDEX IF NOT EXISTS workhub_reminders_role_due_idx ON workhub_reminders (demo_role, due_at);

CREATE TABLE IF NOT EXISTS workhub_notebooks (
  demo_role TEXT NOT NULL REFERENCES workhub_demo_workspaces(demo_role) ON DELETE CASCADE,
  id TEXT NOT NULL,
  title JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (demo_role, id)
);

CREATE TABLE IF NOT EXISTS workhub_notebook_entries (
  demo_role TEXT NOT NULL,
  id TEXT NOT NULL,
  notebook_id TEXT NOT NULL,
  title JSONB NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (demo_role, id),
  CONSTRAINT workhub_entries_notebook_fk
    FOREIGN KEY (demo_role, notebook_id)
    REFERENCES workhub_notebooks(demo_role, id)
    ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS workhub_entries_notebook_idx ON workhub_notebook_entries (demo_role, notebook_id);
