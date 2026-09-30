// Generate the VitePress pages for every subject and model, and the /adapters/
// pages, into site/: step 1 of scripts/build.mjs, and what npm run site:dev
// runs before starting VitePress, so the local site shows the same pages.
import { loadSubjects } from './lib/models.mjs';
import { generateSitePages } from './lib/site.mjs';
import { generateAdapterPages } from './lib/adapter-pages.mjs';
import { discoverAdapters } from './lib/adapters.mjs';
import { pathToFileURL } from 'node:url';

export async function generatePages() {
  const [subjects, adapters] = await Promise.all([loadSubjects(), discoverAdapters()]);
  await generateSitePages(subjects, adapters);
  await generateAdapterPages(subjects, adapters);
  return { subjects, adapters };
}

// Run directly (npm run site:dev), not when build.mjs imports it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await generatePages();
