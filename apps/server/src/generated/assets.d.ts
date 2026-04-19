// Ambient declarations for files embedded via
//   import path from '…' with { type: 'file' };
// Bun resolves these at build time to a string path at runtime.
declare module '*.html' {
  const path: string;
  export default path;
}
declare module '*.js' {
  const path: string;
  export default path;
}
declare module '*.css' {
  const path: string;
  export default path;
}
declare module '*.svg' {
  const path: string;
  export default path;
}
declare module '*.webmanifest' {
  const path: string;
  export default path;
}
declare module '*.png' {
  const path: string;
  export default path;
}
declare module '*.ico' {
  const path: string;
  export default path;
}
declare module '*.woff' {
  const path: string;
  export default path;
}
declare module '*.woff2' {
  const path: string;
  export default path;
}
