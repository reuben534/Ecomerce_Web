import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createAuthApp } from './auth-app.mjs';

const { app, database } = createAuthApp();
const production = process.env.NODE_ENV === 'production';

if (production) {
  const distPath = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
  app.use(express.static(distPath));
  app.get('*', (_request, response) => response.sendFile(resolve(distPath, 'index.html')));
}

const port = Number(process.env.API_PORT ?? 3001);
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`SmartShop auth API listening on http://127.0.0.1:${port}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);