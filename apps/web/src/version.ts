// Werte werden von Vite zur Build-Zeit über `define` ersetzt
// (siehe vite.config.ts). Im Test-Modus greift derselbe Mechanismus.
declare const __APP_VERSION__: string;
declare const __GIT_SHA__: string;
declare const __BUILD_DATE__: string;

export const APP_VERSION: string = __APP_VERSION__;
export const GIT_SHA: string = __GIT_SHA__;
export const BUILD_DATE: string = __BUILD_DATE__;

export const VERSION_LABEL = `v${APP_VERSION}`;
export const VERSION_DETAIL = `${VERSION_LABEL} · ${GIT_SHA} · ${BUILD_DATE}`;
