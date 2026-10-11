// The workflow similar-models.yml: when a model proposal is opened or edited,
// comment the similar models (scripts/lib/similar.mjs), or update the comment
// it made before. The issue body is read from the event file as data.
// Needs GITHUB_EVENT_PATH, GITHUB_REPOSITORY and GITHUB_TOKEN (issues: write).
import { readFile } from 'node:fs/promises';
import { modelIndex, similarModels, proposalText, comment, findMarkedComment } from './lib/similar.mjs';
import { readSnapshot } from './lib/nodes.mjs';

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
const issue = event.issue;

const api = (path, init = {}) => fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
  ...init, headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' },
});
const mine = await findMarkedComment(async (page) => {
  const res = await api(`/issues/${issue.number}/comments?per_page=100&page=${page}`);
  if (!res.ok) throw new Error(`GitHub answered ${res.status} to the comment list: ${await res.text()}`);
  return res.json();
});

const form = proposalText(issue?.body);
if (!form.trim()) {
  // Nothing to search (an edit emptied the sections): a comment made before no longer fits.
  if (mine) {
    const res = await api(`/issues/comments/${mine.id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`GitHub answered ${res.status} to deleting comment ${mine.id}`);
    console.log(`no text to search; deleted comment ${mine.id}`);
  } else console.log('not a model proposal from the form; nothing to do');
  process.exit(0);
}
// The title often names the proposed type (for example "Model: Facility"), so it is searched too.
const text = `${issue?.title ?? ''}\n${form}`;

const catalog = await (await fetch('https://datamodels.jp/catalog.json', { signal: AbortSignal.timeout(15000) })).json();
const results = similarModels(text, modelIndex(catalog, await readSnapshot()));
const body = comment(results);
console.log(body);

const res = mine
  ? await api(`/issues/comments/${mine.id}`, { method: 'PATCH', body: JSON.stringify({ body }) })
  : await api(`/issues/${issue.number}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
if (!res.ok) throw new Error(`GitHub answered ${res.status}: ${await res.text()}`);
console.log(mine ? `updated comment ${mine.id}` : 'commented');
