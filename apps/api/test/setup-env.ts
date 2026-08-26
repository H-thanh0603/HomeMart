import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

for (const rel of ['../../.env', '.env']) {
  const path = resolve(__dirname, rel);
  if (existsSync(path)) config({ path });
}
