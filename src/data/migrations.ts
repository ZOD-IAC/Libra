export type Bind = string | number | null;
export interface Database {
  execSync(sql: string): void;
  runSync(sql: string, ...params: Bind[]): unknown;
  getFirstSync<T>(sql: string, ...params: Bind[]): T | null;
  getAllSync<T>(sql: string, ...params: Bind[]): T[];
  withTransactionSync(fn: () => void): void;
}
export const migrations = [
  `
CREATE TABLE profiles (id INTEGER PRIMARY KEY CHECK(id=1), name TEXT NOT NULL, bio TEXT NOT NULL);
CREATE TABLE plans (id TEXT PRIMARY KEY, name TEXT NOT NULL, activated_on TEXT NOT NULL);
CREATE TABLE versions (id INTEGER PRIMARY KEY AUTOINCREMENT, plan_id TEXT NOT NULL REFERENCES plans(id), version INTEGER NOT NULL, effective_on TEXT NOT NULL, config TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(plan_id,version));
CREATE INDEX versions_lookup ON versions(plan_id,effective_on);
CREATE TABLE preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE goals (plan_id TEXT NOT NULL REFERENCES plans(id), id TEXT NOT NULL, definition TEXT NOT NULL, PRIMARY KEY(plan_id,id));
CREATE TABLE activities (plan_id TEXT NOT NULL REFERENCES plans(id), id TEXT NOT NULL, definition TEXT NOT NULL, PRIMARY KEY(plan_id,id));
CREATE TABLE instances (id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES plans(id), activity_id TEXT NOT NULL, origin_date TEXT NOT NULL, due_date TEXT NOT NULL, time TEXT NOT NULL, definition TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','completed','skipped','na')), values_json TEXT NOT NULL DEFAULT '{}', notes TEXT NOT NULL DEFAULT '', completed_at INTEGER, timer_start INTEGER, timer_seconds REAL NOT NULL DEFAULT 0);
CREATE INDEX instances_day ON instances(plan_id,due_date);
CREATE TABLE measurements (id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES plans(id), metric_id TEXT NOT NULL, date TEXT NOT NULL, value REAL NOT NULL, instance_id TEXT REFERENCES instances(id) ON DELETE CASCADE, input_id TEXT);
CREATE INDEX measurements_history ON measurements(plan_id,metric_id,date);
CREATE TABLE journals (plan_id TEXT NOT NULL REFERENCES plans(id), date TEXT NOT NULL, text TEXT NOT NULL, PRIMARY KEY(plan_id,date));
CREATE TABLE notification_settings (id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL DEFAULT 0, quiet_start TEXT NOT NULL DEFAULT '22:00', quiet_end TEXT NOT NULL DEFAULT '07:00');
INSERT INTO notification_settings(id) VALUES(1);
CREATE TABLE milestone_events (plan_id TEXT NOT NULL REFERENCES plans(id), goal_id TEXT NOT NULL, milestone_id TEXT NOT NULL, reached_on TEXT NOT NULL, PRIMARY KEY(plan_id,goal_id,milestone_id));
`,
  `ALTER TABLE measurements ADD COLUMN recorded_at INTEGER NOT NULL DEFAULT 0;
UPDATE measurements SET recorded_at=COALESCE((SELECT completed_at FROM instances WHERE instances.id=measurements.instance_id),0);
`,
  `CREATE TABLE products (plan_id TEXT NOT NULL REFERENCES plans(id), id TEXT NOT NULL, definition TEXT NOT NULL, PRIMARY KEY(plan_id,id));
CREATE TABLE instance_step_checks (instance_id TEXT NOT NULL REFERENCES instances(id) ON DELETE CASCADE, step_id TEXT NOT NULL, completed_at INTEGER NOT NULL, PRIMARY KEY(instance_id,step_id));
CREATE INDEX step_checks_instance ON instance_step_checks(instance_id);
`,
];
export function migrate(db: Database) {
  db.execSync('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  const current = db.getFirstSync<{ user_version: number }>('PRAGMA user_version')!.user_version;
  if (current > migrations.length) throw new Error('This database needs a newer app.');
  for (let i = current; i < migrations.length; i++)
    db.withTransactionSync(() => {
      db.execSync(migrations[i]);
      db.execSync(`PRAGMA user_version=${i + 1}`);
    });
}
