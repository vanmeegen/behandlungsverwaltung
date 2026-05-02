#!/usr/bin/env bun
/**
 * Polls the GraphQL endpoint until it responds, then exits 0.
 * Used to block until a freshly-started dev server is ready.
 */

const URL = 'http://localhost:4000/graphql';
const TIMEOUT_MS = 30_000;
const INTERVAL_MS = 500;
const start = Date.now();

while (Date.now() - start < TIMEOUT_MS) {
  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
    });
    if (response.ok) {
      const elapsed = Date.now() - start;
      console.log(`GraphQL ready at ${URL} (${elapsed} ms)`);
      process.exit(0);
    }
  } catch (err) {
    // ConnectionRefused/Reset während des Server-Starts ist erwartet — alles
    // andere (z. B. DNS-Fehler oder TLS-Probleme) protokollieren, damit ein
    // hängender Wait nicht völlig stumm endet.
    const code = (err as { code?: string } | null)?.code;
    if (code !== 'ConnectionRefused' && code !== 'ECONNREFUSED' && code !== 'ECONNRESET') {
      console.error('[dev-wait] unexpected fetch error:', err);
    }
  }
  await Bun.sleep(INTERVAL_MS);
}

console.error(`Timed out after ${TIMEOUT_MS} ms waiting for ${URL}`);
process.exit(1);
