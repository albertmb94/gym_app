import { readFileSync, writeFileSync } from 'node:fs';

const dumpPath = process.argv[2] ?? './dump-source.json';
const dump = JSON.parse(readFileSync(dumpPath, 'utf8'));
const only = process.argv.slice(3);
const targets = only.length > 0 ? only : ['albert', 'elena'];
const now = Date.now();

const chunks: { user: string; sql: string }[] = [];

for (const row of dump) {
  if (!targets.includes(row.username)) continue;
  const escaped = row.data.replace(/'/g, "''");
  const sql = `UPDATE users SET data = '${escaped}', revision = revision + 1, updated_at = ${now} WHERE username = '${row.username}';`;
  chunks.push({ user: row.username, sql });
  const path = `scripts/restore-${row.username}.sql`;
  writeFileSync(path, `-- Restaurar ${row.username}\n` + sql + '\n', 'utf8');
  console.log(`${row.username}: ${path} (${(Buffer.byteLength(sql, 'utf8') / 1024).toFixed(1)} KB)`);
}
