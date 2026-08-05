import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

type DumpRow = { username: string; data: string };
type Config = { dumpPath: string };

const CONFIG_PATH = '.restore-data.env.json';
if (!existsSync(CONFIG_PATH)) {
  const sample: Config = { dumpPath: './dump-source.json' };
  writeFileSync(CONFIG_PATH, JSON.stringify(sample, null, 2));
  console.error(`Crea ${CONFIG_PATH} con dumpPath apuntando a tu dump y vuelve a ejecutar.`);
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as Config);
const dumpPath = resolve(process.cwd(), cfg.dumpPath);
if (!existsSync(dumpPath)) {
  console.error(`No se encuentra el dump en ${dumpPath}`);
  process.exit(1);
}

const dump: DumpRow[] = JSON.parse(readFileSync(dumpPath, 'utf8'));
const only = process.argv.slice(2);
const targets = only.length > 0 ? only : ['albert', 'elena'];
const now = Date.now();

const out: string[] = [];
out.push(`-- Restaurar datos desde dump. Generado: ${new Date().toISOString()}`);
out.push('');

for (const row of dump) {
  if (!targets.includes(row.username)) continue;
  const escaped = row.data.replace(/'/g, "''");
  const sql = `UPDATE users SET data = '${escaped}', revision = revision + 1, updated_at = ${now} WHERE username = '${row.username}';`;
  out.push(sql);
  out.push('');
}

writeFileSync('scripts/restore-elena-albert.sql', out.join('\n'), 'utf8');
const totalSize = Buffer.byteLength(out.join('\n'), 'utf8');
console.log(`Generado scripts/restore-elena-albert.sql (${(totalSize / 1024).toFixed(1)} KB)`);
console.log(`Usuarios: ${out.filter(l => l.startsWith('UPDATE')).length}`);
