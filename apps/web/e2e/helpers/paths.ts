import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HELPERS_DIR = resolve(fileURLToPath(import.meta.url), '..');
const REPO_ROOT = resolve(HELPERS_DIR, '..', '..', '..', '..');

export const E2E_HOME = resolve(REPO_ROOT, 'apps', 'server', 'data', 'e2e-home');
export const TEMPLATES_DIR = resolve(E2E_HOME, 'templates');
export const BILLS_DIR = resolve(E2E_HOME, 'bills');
export const TIMESHEETS_DIR = resolve(E2E_HOME, 'timesheets');
