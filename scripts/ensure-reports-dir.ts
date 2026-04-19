#!/usr/bin/env bun
/**
 * Ensures the repo-root `reports/` directory exists so workspace `test:ci`
 * scripts can write JUnit XML into it (relative path `../../reports/*.xml`).
 */
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dir, '..');
await mkdir(resolve(repoRoot, 'reports'), { recursive: true });
