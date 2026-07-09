// Capacitor iOS shell config (STAGED — not active until `npm run ios:bootstrap`).
//
// Why this file is excluded from tsconfig.json: it imports `@capacitor/cli`,
// which is NOT installed until bootstrap runs. Leaving it in the Next.js type-
// check graph would fail `next build` in CI. It is deliberately in tsconfig's
// `exclude` list; the Capacitor CLI reads it directly with its own toolchain.
//
// PennyForge is server-rendered (server components + /api routes + Prisma), so
// there is no static `out/` export to embed. The native shell therefore points
// at the HOSTED deployment via `server.url` (the Vercel URL), matching the
// "native shell pointed at the hosted Next.js app" model in docs/ios-roadmap.md.
// Set CAPACITOR_SERVER_URL to your production/preview URL before `cap sync`.

/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.pennyforge.app',
  appName: 'PennyForge',
  // `webDir` is required by the CLI even in server-url mode, and `cap sync`
  // validates that it contains real web assets (an `index.html`) — the
  // committed `public/index.html` placeholder satisfies that check. It is
  // never actually rendered: the shell loads `server.url` below instead.
  webDir: 'public',
  ios: {
    contentInset: 'always',
  },
  server: process.env.CAPACITOR_SERVER_URL
    ? { url: process.env.CAPACITOR_SERVER_URL, cleartext: false }
    : undefined,
};

export default config;
