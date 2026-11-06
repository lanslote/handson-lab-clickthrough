import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const packaged = new URL('../content/lab-data.js', import.meta.url);
const shared = existsSync(packaged)
  ? await import('../content/curriculum.js')
  : await import('../../shared/curriculum.js');
const source = existsSync(packaged) ? packaged : new URL('../../../lab2/lab-data.js', import.meta.url);
const context = { window: {} };
vm.runInNewContext(readFileSync(source, 'utf8'), context, { timeout: 1000 });
export const curriculum = shared.curriculumFor(context.window.LAB);
export const participantView = shared.participantView;
