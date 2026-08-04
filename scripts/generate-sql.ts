import { readFileSync, writeFileSync } from 'node:fs';

type DumpRow = { username: string; data: string };
const dump: DumpRow[] = JSON.parse(readFileSync('dump.json', 'utf8'));
const only = process.argv.slice(2);

const out: string[] = [];
out.push('-- SQL generado desde el dump. Ejecutar con: turso db shell <db> < restore.sql');
out.push('-- Solo incluye los usuarios del dump (o los filtrados por argv).');
out.push('');

for (const row of dump) {
  if (only.length > 0 && !only.includes(row.username)) continue;
  const data = row.data;
  // Escapar comillas simples para SQL (doble comilla simple)
  const escaped = data.replace(/'/g, "''");
  out.push(`UPDATE users SET data = '${escaped}', revision = revision + 1, updated_at = ${Date.now()} WHERE username = '${row.username}';`);
}

writeFileSync('restore.sql', out.join('\n') + '\n', 'utf8');
console.log(`restore.sql generado (${out.length - 3} statements)`);
