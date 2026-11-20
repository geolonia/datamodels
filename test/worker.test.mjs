// The Worker for /ns/* (worker/index.mjs, #196): JSON-LD clients get the
// vocabulary, browsers the page, unknown IRIs a 404.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { prefersJsonLd, MAJORS_TTL_MS } from '../worker/index.mjs';

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
const get = (path, accept, method = 'GET') => worker.fetch(new Request(`https://datamodels.jp${path}`, { method, headers: accept ? { accept } : {} }), env);

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

test('only GET and HEAD are negotiated; other methods get the static answer', async () => {
  assert.equal((await get('/ns/task/Task', 'application/ld+json', 'HEAD')).status, 303);
  for (const method of ['OPTIONS', 'POST']) {
    const r = await get('/ns/task/Task', 'application/ld+json', method);
    assert.equal(r.status, 302, method);
    assert.equal(r.headers.get('location'), '/models/task/Task/', method);
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

test('an error in the script falls back to the static answer', async () => {
  // A request whose headers cannot be read.
  const broken = { url: 'https://datamodels.jp/ns/task/Task', headers: { get() { throw new Error('boom'); } } };
  const r = await worker.fetch(broken, env);
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/models/task/Task/');
});

// The same assets, with catalog.json as given (#298).
const withCatalog = (catalog) => ({
  ASSETS: {
    async fetch(input) {
      const { pathname } = new URL(typeof input === 'string' ? input : input.url ?? input);
      if (pathname === '/catalog.json') return catalog();
      return env.ASSETS.fetch(input);
    },
  },
});
const jsonLd = (e) => worker.fetch(new Request('https://datamodels.jp/ns/task/Task', { headers: { accept: 'application/ld+json' } }), e);
const v1 = withCatalog(() => Response.json({ models: [{ subject: 'task', version: '1.0.0' }] }));
const v2 = withCatalog(() => Response.json({ models: [{ subject: 'task', version: '2.0.0' }] }));

test('the subject majors are read again after five minutes', async (t) => {
  // Far enough ahead that what earlier tests cached has expired.
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() + 10 * MAJORS_TTL_MS });
  assert.equal((await jsonLd(v1)).headers.get('location'), '/vocab/task/v1.jsonld');
  t.mock.timers.tick(MAJORS_TTL_MS - 1);
  assert.equal((await jsonLd(v2)).headers.get('location'), '/vocab/task/v1.jsonld', 'still cached');
  t.mock.timers.tick(1);
  assert.equal((await jsonLd(v2)).headers.get('location'), '/vocab/task/v2.jsonld', 'read again');
});

test('a failed read of catalog.json is not cached', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() + 20 * MAJORS_TTL_MS });
  let reads = 0;
  const failing = withCatalog(() => { reads++; return new Response('error', { status: 500 }); });
  const r = await jsonLd(failing);
  assert.equal(r.status, 302, 'the static answer');
  assert.equal(r.headers.get('location'), '/models/task/Task/');
  assert.equal((await jsonLd(failing)).status, 302);
  assert.equal(reads, 2, 'read again on the next request');
  // Same moment, catalog.json back: the next request reads it at once.
  assert.equal((await jsonLd(v1)).status, 303);
  // A thrown fetch is not cached either.
  t.mock.timers.tick(MAJORS_TTL_MS);
  const throwing = withCatalog(() => { throw new Error('network'); });
  assert.equal((await jsonLd(throwing)).status, 302);
  assert.equal((await jsonLd(v2)).headers.get('location'), '/vocab/task/v2.jsonld');
});
