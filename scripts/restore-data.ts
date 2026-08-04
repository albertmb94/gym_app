import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

type Config = {
  dumpPath: string;
  adminToken: string;
  apiBase: string;
};

const CONFIG_PATH = resolve(process.cwd(), '.restore-data.env.json');
if (!existsSync(CONFIG_PATH)) {
  const sample = {
    dumpPath: './dump.json',
    adminToken: 'TU_ADMIN_RESET_TOKEN',
    apiBase: 'https://gymappvercel.vercel.app',
  };
  writeFileSync(CONFIG_PATH, JSON.stringify(sample, null, 2));
  console.error(`Crea ${CONFIG_PATH} con tus valores y vuelve a ejecutar.`);
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as Config;
const dumpPath = resolve(process.cwd(), cfg.dumpPath);
if (!existsSync(dumpPath)) {
  console.error(`No se encuentra el dump en ${dumpPath}`);
  process.exit(1);
}

const dump = JSON.parse(readFileSync(dumpPath, 'utf8'));
if (!Array.isArray(dump)) {
  console.error('El dump debe ser un array de objetos { username, data }');
  process.exit(1);
}

const onlyFilter = process.argv.slice(2);

async function restoreUser(row: { username: string; data: string }): Promise<void> {
  const inner = JSON.parse(row.data);
  const body = { username: row.username, data: inner };
  const res = await fetch(`${cfg.apiBase}/api/admin/restore-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': cfg.adminToken,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`${row.username} -> ${res.status} ${text}`);
}

for (const row of dump) {
  if (onlyFilter.length > 0 && !onlyFilter.includes(row.username)) continue;
  await restoreUser(row);
}
