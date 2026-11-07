import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const packaged = new URL('../content/lab-data.js', import.meta.url);
const original = new URL('../../../lab2/lab-data.js', import.meta.url);
const hasSource = existsSync(original);
const shared = hasSource
  ? await import('../../shared/curriculum.js')
  : await import('../content/curriculum.js');
const source = hasSource ? original : packaged;
const context = { window: {} };
vm.runInNewContext(readFileSync(source, 'utf8'), context, { timeout: 1000 });
export const curriculum = shared.curriculumFor(context.window.LAB);
export const participantView = shared.participantView;
