// The workflow similar-models.yml: when a model proposal is opened or edited,
// comment the similar models (scripts/lib/similar.mjs), or update the comment
// it made before. The issue body is read from the event file as data.
// Needs GITHUB_EVENT_PATH, GITHUB_REPOSITORY and GITHUB_TOKEN (issues: write).
import { readFile } from 'node:fs/promises';
import { modelIndex, similarModels, proposalText, comment, MARKER } from './lib/similar.mjs';
import { readSnapshot } from './lib/nodes.mjs';

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
const issue = event.issue;
const text = proposalText(issue?.body);
if (!text.trim()) { console.log('not a model proposal from the form; nothing to do'); process.exit(0); }

const catalog = await (await fetch('https://datamodels.jp/catalog.json', { signal: AbortSignal.timeout(15000) })).json();
const results = similarModels(text, modelIndex(catalog, await readSnapshot()));
const body = comment(results);
console.log(body);

const api = (path, init = {}) => fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
  ...init, headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' },
});
const comments = await (await api(`/issues/${issue.number}/comments?per_page=100`)).json();
const mine = Array.isArray(comments) ? comments.find((c) => c.user?.type === 'Bot' && c.body?.startsWith(MARKER)) : null;
const res = mine
  ? await api(`/issues/comments/${mine.id}`, { method: 'PATCH', body: JSON.stringify({ body }) })
  : await api(`/issues/${issue.number}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
if (!res.ok) throw new Error(`GitHub answered ${res.status}: ${await res.text()}`);
console.log(mine ? `updated comment ${mine.id}` : 'commented');
