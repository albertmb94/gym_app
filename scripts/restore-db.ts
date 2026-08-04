import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createClient } from '@libsql/client';

type DumpRow = { username: string; data: string };
type Config = { dumpPath: string };

const CONFIG_PATH = '.restore-data.env.json';
if (!existsSync(CONFIG_PATH)) {
  const sample: Config = { dumpPath: './dump.json' };
  writeFileSync(CONFIG_PATH, JSON.stringify(sample, null, 2));
  console.error(`Crea ${CONFIG_PATH} con dumpPath apuntando a tu dump y vuelve a ejecutar.`);
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as Config;
const dump: DumpRow[] = JSON.parse(readFileSync(cfg.dumpPath, 'utf8'));
const only = process.argv.slice(2);

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error('Faltan TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en el entorno');
  console.error('Ejemplo: $env:TURSO_DATABASE_URL="libsql://..."; $env:TURSO_AUTH_TOKEN="..."; npm run restore:db -- elena');
  process.exit(1);
}

const client = createClient({ url, authToken });

for (const row of dump) {
  if (only.length > 0 && !only.includes(row.username)) continue;
  const data = row.data;
  try {
    await client.execute({
      sql: 'UPDATE users SET data = ?, revision = revision + 1, updated_at = ? WHERE username = ?',
      args: [data, Date.now(), row.username],
    });
    const bytes = Buffer.byteLength(data, 'utf8');
    console.log(`+ ${row.username}: restaurado (${bytes} bytes)`);
  } catch (err) {
    console.log(`- ${row.username}: ERROR ${(err as Error).message}`);
  }
}

console.log('\nVerificando:');
const res = await client.execute('SELECT username, length(data) as data_len, revision FROM users ORDER BY username');
for (const row of res.rows) {
  console.log(`  ${row.username}: ${row.data_len} bytes, revision ${row.revision}`);
}
