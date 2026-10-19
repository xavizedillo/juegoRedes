# RogueWeb: Echoes of the Grid

## Deploy to Railway

The Railway configuration builds and starts the Next.js app and Socket.IO game
server together in one service. Socket connections use the same public domain as
the app.

1. Create a Railway project from this GitHub repository and deploy the
   repository root. Railway reads `railway.json` for the build, start, and
   health-check commands.
2. Add a PostgreSQL service to the project and set both `DATABASE_URL` and
   `DIRECT_URL` on the game service to the PostgreSQL service's connection URL
   (for example, reference the PostgreSQL service's `DATABASE_URL` variable).
   The app runs `prisma db push` on startup to synchronize the schema without
   requiring a migration history for an existing database.
3. Generate a public domain for the game service. No separate web or socket
   service is needed.
4. Socket.IO connects to the same origin as the game, so no separate socket URL
   or port configuration is needed.

For local development, use `npm run dev:full` to start the Next.js app and the
Socket.IO server together. `npm run dev` starts only the Next.js app. The app
connects to its current origin; the server uses Railway's `PORT` environment
variable in production.
