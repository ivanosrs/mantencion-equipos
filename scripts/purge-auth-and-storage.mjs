// Purga las cuentas de Supabase Auth y los archivos de Storage que quedan
// sueltos despues de correr 0011_purge_data.sql.
//
// Por que un script y no SQL: SQL plano no borra cuentas de auth (vive en el
// schema auth, manejado por GoTrue) ni objetos de los buckets de storage.
// Sin este paso quedan dos tipos de basura:
//
//   1. Cuentas huerfanas: borrar la fila de profiles NO borra la cuenta de
//      auth. Esas cuentas siguen pasando signInWithPassword, y en
//      lib/auth.ts el chequeo es `profile?.is_active === false` sobre un
//      profile inexistente (undefined), que no dispara el signOut. El
//      usuario entra al dashboard y queda sin perfil ni rol admin.
//
//   2. Archivos: client_signature_path y attachment_path solo guardan el
//      path. Las firmas y adjuntos sobreviven al borrado de filas.
//
// Los buckets NO se dropean: el codigo los referencia por nombre
// (lib/pdf/work-order.ts y app/dashboard/equipments/[id]/page.tsx). Se
// vacian.
//
// Uso:
//   node scripts/purge-auth-and-storage.mjs            (solo lista)
//   node scripts/purge-auth-and-storage.mjs --execute  (borra)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const EXECUTE = process.argv.includes('--execute');

// Cuentas que sobreviven. Tiene que coincidir con la lista de
// 0011_purge_data.sql y 0010_profiles_is_hidden.sql.
const KEEP_EMAILS = [
  'diegop.salas@gmail.com',
  'ivanvidalsepulveda@gmail.com',
];

// Buckets a vaciar. Los mismos nombres que usa el codigo.
const BUCKETS = ['signatures', 'attachments'];

const envPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '.env.local'
);

function loadEnv(file) {
  const values = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return values;
}

const env = loadEnv(envPath);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const keep = new Set(KEEP_EMAILS.map((email) => email.toLowerCase()));

// --- Cuentas de auth -------------------------------------------------------

const authUsers = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) {
    console.error('Error listando usuarios de auth:', error.message);
    process.exit(1);
  }
  authUsers.push(...data.users);
  if (data.users.length < 1000) break;
}

const doomedAuth = authUsers.filter(
  (user) => !keep.has((user.email ?? '').toLowerCase())
);

console.log('\n== Cuentas de auth ==');
console.log(`total: ${authUsers.length}`);
console.log(`a eliminar: ${doomedAuth.length}`);
console.log(`a conservar: ${authUsers.length - doomedAuth.length}`);
for (const user of doomedAuth) {
  console.log(`  - ${user.email ?? '(sin email)'}  ${user.id}`);
}
for (const user of authUsers.filter((u) => keep.has((u.email ?? '').toLowerCase()))) {
  console.log(`  = ${user.email}  ${user.id}`);
}

// --- Storage ----------------------------------------------------------------

const objectsByBucket = new Map();
for (const bucket of BUCKETS) {
  const { data, error } = await db.storage.from(bucket).list('', { limit: 1000 });
  if (error) {
    console.log(`\nbucket "${bucket}": ${error.message} (puede no existir)`);
    continue;
  }

  const prefixes = data.map((entry) => entry.name);
  const objects = [];
  for (const prefix of prefixes) {
    for (let offset = 0; ; ) {
      const { data: files, error: listError } = await db.storage
        .from(bucket)
        .list(prefix, { limit: 1000, offset });
      if (listError) throw listError;
      if (files.length === 0) break;
      objects.push(...files.map((file) => `${prefix}/${file.name}`));
      offset += files.length;
      if (files.length < 1000) break;
    }
  }

  objectsByBucket.set(bucket, objects);
  console.log(`\n== bucket "${bucket}" ==`);
  console.log(`carpetas: ${prefixes.length}`);
  console.log(`archivos: ${objects.length}`);
  for (const objectPath of objects) {
    console.log(`  - ${objectPath}`);
  }
}

// --- Ejecucion --------------------------------------------------------------

if (!EXECUTE) {
  console.log('\nSolo lectura. Correr con --execute para borrar.');
  process.exit(0);
}

console.log('\nBorrando...');

for (const user of doomedAuth) {
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(`  ERROR al borrar ${user.email}: ${error.message}`);
  } else {
    console.log(`  cuenta eliminada: ${user.email}`);
  }
}

for (const [bucket, objects] of objectsByBucket) {
  if (objects.length === 0) continue;
  const { error } = await db.storage.from(bucket).remove(objects);
  if (error) {
    console.error(`  ERROR al vaciar ${bucket}: ${error.message}`);
  } else {
    console.log(`  ${bucket}: ${objects.length} archivos eliminados`);
  }
}

console.log('\nListo. Los buckets se conservaron (el codigo los referencia).');
