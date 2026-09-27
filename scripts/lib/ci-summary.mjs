// On GitHub Actions, add a failure report to the job summary, so it is
// readable on the pull request's Checks page without opening the log.
// Elsewhere this does nothing.
import { appendFile } from 'node:fs/promises';

const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

/**
 * @param {string} title   heading, e.g. "Model validation failed"
 * @param {string[]} lines "path: message" lines as printed to the log
 * @param {string} hint    what to do next, in one or two sentences
 */
export async function reportFailures(title, lines, hint) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const rows = lines.map((l) => {
    const i = l.indexOf(': ');
    return i > 0 ? `| \`${cell(l.slice(0, i))}\` | ${cell(l.slice(i + 2))} |` : `| | ${cell(l)} |`;
  });
  await appendFile(file, `### ${title} (${lines.length})\n\n| Where | Problem |\n|---|---|\n${rows.join('\n')}\n\n${hint}\n\n`);
}
