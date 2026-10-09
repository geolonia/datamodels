// The Worker for /ns/* (worker/index.mjs, #196): JSON-LD clients get the
// vocabulary, browsers the page, unknown IRIs a 404.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { prefersJsonLd } from '../worker/index.mjs';

// The static assets as the Worker sees them: _redirects for known IRIs, catalog.json, else 404.
const env = {
  ASSETS: {
    async fetch(input) {
      const { pathname } = new URL(typeof input === 'string' ? input : input.url ?? input);
      if (pathname === '/catalog.json') return Response.json({ models: [{ subject: 'task', version: '1.0.0' }, { subject: 'common', version: '2.1.0' }] });
      if (pathname === '/ns/task/Task') return new Response(null, { status: 302, headers: { location: '/models/task/Task/' } });
      if (pathname === '/ns/task/') return new Response(null, { status: 302, headers: { location: '/models/task/' } });
      if (pathname === '/ns/common/Geometry') return new Response(null, { status: 302, headers: { location: '/models/common/Geometry/' } });
      return new Response('not found', { status: 404 });
    },
  },
};
const get = (path, accept) => worker.fetch(new Request(`https://datamodels.jp${path}`, { headers: accept ? { accept } : {} }), env);

test('JSON-LD ranked above HTML wins; a tie, a wildcard or no Accept goes to the page', () => {
  assert.equal(prefersJsonLd('application/ld+json'), true);
  assert.equal(prefersJsonLd('application/ld+json, application/json'), true); // jsonld.js
  assert.equal(prefersJsonLd('application/json'), true);
  assert.equal(prefersJsonLd('text/html, application/ld+json;q=0.9'), false);
  assert.equal(prefersJsonLd('application/ld+json;q=0.9, text/html;q=0.5'), true);
  assert.equal(prefersJsonLd('application/ld+json, text/html'), false);
  assert.equal(prefersJsonLd('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'), false); // a browser
  assert.equal(prefersJsonLd('*/*'), false); // curl
  assert.equal(prefersJsonLd('application/ld+json;q=0'), false);
  assert.equal(prefersJsonLd(null), false);
  assert.equal(prefersJsonLd('text/turtle'), false);
});

test('a JSON-LD client gets a 303 to the subject vocabulary, for types, attributes and the namespace', async () => {
  for (const [path, location] of [['/ns/task/Task', '/vocab/task/v1.jsonld'], ['/ns/task/', '/vocab/task/v1.jsonld'], ['/ns/common/Geometry', '/vocab/common/v2.jsonld']]) {
    const r = await get(path, 'application/ld+json');
    assert.equal(r.status, 303, path);
    assert.equal(r.headers.get('location'), location, path);
    assert.equal(r.headers.get('vary'), 'Accept');
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
  }
});

test('a browser keeps the redirect to the page, now marked Vary: Accept', async () => {
  const r = await get('/ns/task/Task', 'text/html,application/xhtml+xml,*/*;q=0.8');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/models/task/Task/');
  assert.equal(r.headers.get('vary'), 'Accept');
  assert.equal((await get('/ns/task/Task')).status, 302, 'no Accept header');
});

test('an unknown IRI or subject stays a 404, also for JSON-LD clients', async () => {
  assert.equal((await get('/ns/task/Nope', 'application/ld+json')).status, 404);
  assert.equal((await get('/ns/nope/Thing', 'application/ld+json')).status, 404);
});
