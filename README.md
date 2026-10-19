# RogueWeb: Echoes of the Grid

## Deploy to Railway

The Railway configuration builds and starts the Next.js app and Socket.IO game
server together in one service. Socket connections use the same public domain as
the app unless `NEXT_PUBLIC_SOCKET_URL` is explicitly set.

1. Create a Railway project from this GitHub repository and deploy the
   repository root. Railway reads `railway.json` for the build, start, and
   health-check commands.
2. Add a PostgreSQL service to the project and set both `DATABASE_URL` and
   `DIRECT_URL` on the game service to the PostgreSQL service's connection URL
   (for example, reference the PostgreSQL service's `DATABASE_URL` variable).
   The app runs `prisma migrate deploy` on startup.
3. Generate a public domain for the game service. No separate web or socket
   service is needed.
4. Leave `NEXT_PUBLIC_SOCKET_URL` unset to use the game's public domain for
   Socket.IO. If set, it must be the public URL of the game service.

For local development, use `npm run dev:full` to start the Next.js app and the
Socket.IO server together. `npm run dev` starts only the Next.js app. The app
connects to its current origin by default; set `NEXT_PUBLIC_SOCKET_URL` if the
Socket.IO server is running elsewhere.
