import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { parseApiPort, resolveLocalApiBinding } from "./config.mjs";

const { Pool } = pg;
const PORT = parseApiPort(process.env.API_PORT);
const { host: HOST, ignoredHostOverride } = resolveLocalApiBinding(process.env.API_HOST);
if (ignoredHostOverride) {
  console.warn("Ignoring API_HOST: the local demo API is restricted to 127.0.0.1.");
}
const DATABASE_URL = process.env.DATABASE_URL || "postgres://hrms_local:hrms_local_dev_only@127.0.0.1:5433/hrms_local";
const LOCAL_DEMO_MODE = process.env.HRMS_LOCAL_DEMO_MODE === "true" || process.argv.includes("--local-demo");
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const ALLOWED_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "HR_OPS", "MANAGER", "EMPLOYEE"]);
const MIGRATION_PATH = fileURLToPath(new URL("./migrations/001_workhub.sql", import.meta.url));

if (!LOCAL_DEMO_MODE) {
  throw new Error("This API scaffold is local-demo only. Set HRMS_LOCAL_DEMO_MODE=true for fake-data development.");
}
if (process.env.NODE_ENV === "production") {
  throw new Error("The local demo-role API must never run with NODE_ENV=production.");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
};

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isTimestamp = (value) => typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value));
const isWorkHubText = (value) => {
  if (typeof value === "string") return value.length <= 20_000;
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => (key === "en" || key === "ar") && typeof value[key] === "string" && value[key].length <= 20_000);
};
const isBoundedId = (value) => typeof value === "string" && value.length > 0 && value.length <= 120 && /^[A-Za-z0-9._:-]+$/.test(value);

const validateSnapshot = (value) => {
  if (!isRecord(value) || !Array.isArray(value.tasks) || !Array.isArray(value.reminders) || !Array.isArray(value.notebooks)) return false;
  if (value.tasks.length > 1_000 || value.reminders.length > 1_000 || value.notebooks.length > 200) return false;

  const taskIds = new Set();
  for (const task of value.tasks) {
    if (!isRecord(task) || !isBoundedId(task.id) || taskIds.has(task.id)) return false;
    taskIds.add(task.id);
    if (!isWorkHubText(task.title) || !isWorkHubText(task.description)) return false;
    if (!(task.dueAt === null || isTimestamp(task.dueAt))) return false;
    if (!["LOW", "NORMAL", "HIGH", "URGENT"].includes(task.priority)) return false;
    if (!["TODO", "IN_PROGRESS", "DONE"].includes(task.status)) return false;
    if (!isTimestamp(task.createdAtIso) || !isTimestamp(task.updatedAtIso)) return false;
  }

  const reminderIds = new Set();
  for (const reminder of value.reminders) {
    if (!isRecord(reminder) || !isBoundedId(reminder.id) || reminderIds.has(reminder.id)) return false;
    reminderIds.add(reminder.id);
    if (!isWorkHubText(reminder.title) || !isWorkHubText(reminder.details) || !isTimestamp(reminder.dueAt)) return false;
    if (!["ACTIVE", "DONE"].includes(reminder.status)) return false;
    if (!isTimestamp(reminder.createdAtIso) || !isTimestamp(reminder.updatedAtIso)) return false;
  }

  const notebookIds = new Set();
  const entryIds = new Set();
  let entryCount = 0;
  for (const notebook of value.notebooks) {
    if (!isRecord(notebook) || !isBoundedId(notebook.id) || notebookIds.has(notebook.id)) return false;
    notebookIds.add(notebook.id);
    if (!isWorkHubText(notebook.title) || !Array.isArray(notebook.entries)) return false;
    if (!isTimestamp(notebook.createdAtIso) || !isTimestamp(notebook.updatedAtIso)) return false;
    entryCount += notebook.entries.length;
    if (entryCount > 2_000) return false;
    for (const entry of notebook.entries) {
      if (!isRecord(entry) || !isBoundedId(entry.id) || entryIds.has(entry.id)) return false;
      entryIds.add(entry.id);
      if (!isWorkHubText(entry.title) || !isWorkHubText(entry.content)) return false;
      if (!isTimestamp(entry.createdAtIso) || !isTimestamp(entry.updatedAtIso)) return false;
    }
  }
  return true;
};

const readJsonBody = async (request) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("Request body is too large"), { statusCode: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Invalid JSON body"), { statusCode: 400 });
  }
};

const requireDemoRole = (request) => {
  const role = request.headers["x-demo-role"];
  if (typeof role !== "string" || !ALLOWED_ROLES.has(role)) {
    throw Object.assign(new Error("A valid local demo role is required"), { statusCode: 401 });
  }
  return role;
};

const isoValue = (value) => value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const readWorkspace = async (role) => {
  const workspace = await pool.query(
    "SELECT demo_role FROM workhub_demo_workspaces WHERE demo_role = $1",
    [role]
  );
  if (workspace.rowCount === 0) return null;

  const [taskRows, reminderRows, notebookRows, entryRows] = await Promise.all([
    pool.query(`SELECT id, title, description, due_at, priority, status, created_at, updated_at
      FROM workhub_tasks WHERE demo_role = $1 ORDER BY created_at DESC`, [role]),
    pool.query(`SELECT id, title, details, due_at, status, created_at, updated_at
      FROM workhub_reminders WHERE demo_role = $1 ORDER BY due_at`, [role]),
    pool.query(`SELECT id, title, created_at, updated_at
      FROM workhub_notebooks WHERE demo_role = $1 ORDER BY created_at DESC`, [role]),
    pool.query(`SELECT id, notebook_id, title, content, created_at, updated_at
      FROM workhub_notebook_entries WHERE demo_role = $1 ORDER BY created_at DESC`, [role])
  ]);

  const entriesByNotebook = new Map();
  for (const row of entryRows.rows) {
    const entries = entriesByNotebook.get(row.notebook_id) ?? [];
    entries.push({
      id: row.id,
      title: row.title,
      content: row.content,
      createdAtIso: isoValue(row.created_at),
      updatedAtIso: isoValue(row.updated_at)
    });
    entriesByNotebook.set(row.notebook_id, entries);
  }

  return {
    tasks: taskRows.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      dueAt: row.due_at === null ? null : row.due_at,
      priority: row.priority,
      status: row.status,
      createdAtIso: isoValue(row.created_at),
      updatedAtIso: isoValue(row.updated_at)
    })),
    reminders: reminderRows.rows.map((row) => ({
      id: row.id,
      title: row.title,
      details: row.details,
      dueAt: row.due_at,
      status: row.status,
      createdAtIso: isoValue(row.created_at),
      updatedAtIso: isoValue(row.updated_at)
    })),
    notebooks: notebookRows.rows.map((row) => ({
      id: row.id,
      title: row.title,
      entries: entriesByNotebook.get(row.id) ?? [],
      createdAtIso: isoValue(row.created_at),
      updatedAtIso: isoValue(row.updated_at)
    }))
  };
};

const replaceWorkspace = async (role, data) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO workhub_demo_workspaces (demo_role) VALUES ($1)
       ON CONFLICT (demo_role) DO UPDATE SET updated_at = NOW()`,
      [role]
    );
    await client.query("DELETE FROM workhub_tasks WHERE demo_role = $1", [role]);
    await client.query("DELETE FROM workhub_reminders WHERE demo_role = $1", [role]);
    await client.query("DELETE FROM workhub_notebooks WHERE demo_role = $1", [role]);

    for (const task of data.tasks) {
      await client.query(
        `INSERT INTO workhub_tasks
          (demo_role, id, title, description, due_at, priority, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [role, task.id, task.title, task.description, task.dueAt, task.priority, task.status, task.createdAtIso, task.updatedAtIso]
      );
    }
    for (const reminder of data.reminders) {
      await client.query(
        `INSERT INTO workhub_reminders
          (demo_role, id, title, details, due_at, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [role, reminder.id, reminder.title, reminder.details, reminder.dueAt, reminder.status, reminder.createdAtIso, reminder.updatedAtIso]
      );
    }
    for (const notebook of data.notebooks) {
      await client.query(
        `INSERT INTO workhub_notebooks (demo_role, id, title, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [role, notebook.id, notebook.title, notebook.createdAtIso, notebook.updatedAtIso]
      );
      for (const entry of notebook.entries) {
        await client.query(
          `INSERT INTO workhub_notebook_entries
            (demo_role, id, notebook_id, title, content, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [role, entry.id, notebook.id, entry.title, entry.content, entry.createdAtIso, entry.updatedAtIso]
        );
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  if (request.method === "GET" && requestUrl.pathname === "/api/health") {
    try {
      await pool.query("SELECT 1");
      sendJson(response, 200, { ok: true, mode: "local-demo", database: "postgresql" });
    } catch {
      sendJson(response, 503, { ok: false, mode: "local-demo", database: "unavailable" });
    }
    return;
  }

  if (requestUrl.pathname !== "/api/workhub") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  try {
    const role = requireDemoRole(request);
    if (request.method === "GET") {
      const data = await readWorkspace(role);
      sendJson(response, 200, { role, data });
      return;
    }
    if (request.method === "PUT") {
      if (!request.headers["content-type"]?.toLowerCase().includes("application/json")) {
        sendJson(response, 415, { error: "Content-Type must be application/json" });
        return;
      }
      const payload = await readJsonBody(request);
      if (!isRecord(payload) || !validateSnapshot(payload.data)) {
        sendJson(response, 422, { error: "Invalid Work Hub demo snapshot" });
        return;
      }
      await replaceWorkspace(role, payload.data);
      sendJson(response, 200, { ok: true, role, savedAt: new Date().toISOString() });
      return;
    }
    response.setHeader("Allow", "GET, PUT");
    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    if (statusCode >= 500) console.error("Local Work Hub API request failed:", error?.message ?? "unknown error");
    sendJson(response, statusCode, { error: statusCode >= 500 ? "Local API request failed" : error.message });
  }
});

const start = async () => {
  const migration = await readFile(MIGRATION_PATH, "utf8");
  await pool.query(migration);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, HOST, resolve);
  });
  console.log(`Local fake-data API listening at http://${HOST}:${PORT}`);
};

const stop = async () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

start().catch(async (error) => {
  console.error("Could not start the local Work Hub API. Check that the local PostgreSQL container is running.");
  console.error(error?.message ?? error);
  await pool.end();
  process.exit(1);
});
