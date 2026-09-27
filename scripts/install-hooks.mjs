// Instala el hook pre-commit que bumpea la version en package.json.
// Se ejecuta desde el script `prepare` de package.json para que el hook
// exista tambien en clones nuevos (.git/hooks no se versiona).
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const hooksDir = path.join(repoRoot, '.git', 'hooks');
const hookPath = path.join(hooksDir, 'pre-commit');

const hook = `#!/bin/sh
node scripts/bump-version.mjs && git add package.json
`;

try {
  mkdirSync(hooksDir, { recursive: true });
  writeFileSync(hookPath, hook);
  chmodSync(hookPath, 0o755);
  console.log('pre-commit hook instalado');
} catch {
  // Sin permisos (CI, artefactos) no es motivo para fallar la instalacion.
  console.log('No se pudo instalar el hook pre-commit, se omite');
}
