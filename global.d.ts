// Allows TypeScript to accept side-effect CSS imports (e.g. import './foo.css')
// Next.js / Webpack handles the actual bundling; this declaration silences the TS2882 error.
declare module '*.css';
