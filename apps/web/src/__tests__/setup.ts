import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// Align Testing Library with Playwright's data-testselector convention
// (AGENTS.md). Keeps unit + e2e selectors identical.
configure({ testIdAttribute: 'data-testselector' });
