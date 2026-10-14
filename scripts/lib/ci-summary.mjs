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
    // "Where" only when the text before the first ': ' is a path (it has a / or a .); a message,
    // or a label such as "missing", can come before ': ' too.
    const i = l.indexOf(': ');
    return i > 0 && /^[\w@-]*[./][\w./@-]*$/.test(l.slice(0, i)) ? `| \`${cell(l.slice(0, i))}\` | ${cell(l.slice(i + 2))} |` : `| | ${cell(l)} |`;
  });
  await appendFile(file, `### ${title} (${lines.length})\n\n| Where | Problem |\n|---|---|\n${rows.join('\n')}\n\n${hint}\n\n`);
}
