import { mkdir, copyFile } from 'node:fs/promises';

await mkdir(new URL('../content/', import.meta.url), { recursive: true });
await copyFile(new URL('../../../lab2/lab-data.js', import.meta.url), new URL('../content/lab-data.js', import.meta.url));
await copyFile(new URL('../../shared/curriculum.js', import.meta.url), new URL('../content/curriculum.js', import.meta.url));
console.log('Packaged Lab 2 content and shared curriculum for Functions deployment.');
