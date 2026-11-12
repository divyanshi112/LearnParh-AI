import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { test } from 'node:test';

process.env.CLIENT_URL = 'https://configured.example';
const { default: corsMiddleware } = await import('../middleware/cors.middleware.js');

test('CORS permits auth requests from configured, deployed, and local origins', async t => {
  const app = express();
  app.use(corsMiddleware);
  app.post(['/api/auth/register', '/api/auth/login'], (_req, res) => {
    res.sendStatus(204);
  });

  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const origins = [
    'https://learn-parh-99igngzlu-learnpath-ai.vercel.app',
    'https://learnparh-ai.vercel.app',
    'https://configured.example',
    'http://localhost:5173'
  ];

  for (const origin of origins) {
    const preflight = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization'
      }
    });

    assert.equal(preflight.status, 200);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    assert.equal(
      preflight.headers.get('access-control-allow-methods'),
      'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    );
    assert.equal(
      preflight.headers.get('access-control-allow-headers'),
      'Content-Type,Authorization'
    );
    assert.equal(preflight.headers.get('access-control-allow-credentials'), null);

    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: '{}'
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
  }
});

test('CORS does not allow unknown origins or a trailing-slash origin', async t => {
  const app = express();
  app.use(corsMiddleware);
  app.options('*', (_req, res) => res.sendStatus(200));

  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));

  for (const origin of [
    'https://untrusted.example',
    'https://learn-parh-99igngzlu-learnpath-ai.vercel.app/'
  ]) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST'
      }
    });

    assert.equal(response.headers.get('access-control-allow-origin'), null);
  }
});
