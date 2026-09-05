// The root package.json says "type": "module", so files under dist-cjs would be
// parsed as ESM. Dropping a scoped package.json marker next to them is the
// standard dual-publish trick — worth knowing when an interviewer asks about
// ESM/CJS interop pain.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist-cjs');
writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
