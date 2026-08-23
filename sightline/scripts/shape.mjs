// sightline — what each artifact has to be, in one table.
// The conventions were prose in SKILL.md, which means they held whenever the
// model happened to remember them: findings landed without `Decides:`, rows
// with the `touched:` stamp below the fence where nothing reads it. The table
// is the same conventions somewhere a script can refuse.
//
// `write` reads it to refuse a malformed file at birth; `check` reads it to
// audit what is already on disk. That shared use is the only reason it is its
// own file. No deps.

// keys — frontmatter that must be present (empty value is fine, absent is not)
// must — lines that must appear in the body, at the start of a line
export const SHAPES = {
  'current-state.md': { keys: ['paths', 'unread'] },
  'impact.md': { keys: ['paths'], must: ['## Moves'] },
  'alternatives.md': { keys: ['paths'] },
  q: { keys: ['paths'] },
  findings: { keys: ['paths', 'requires'], must: ['Decides:'] },
};

// A path inside the effort → its shape. Directories are the kind; the numbered
// filename inside them is not.
export const kindOf = (rel) => {
  const clean = rel.replace(/^\.?\//, '');
  if (clean.startsWith('q/')) return 'q';
  if (clean.startsWith('findings/')) return 'findings';
  return SHAPES[clean] ? clean : null;
};

export const KNOWN = ['current-state.md', 'impact.md', 'alternatives.md',
  'q/<nn>-<slug>.md', 'findings/<nn>.md'];

// `touched:` is never a flag. A date the model types is a date the model can
// get wrong, and a wrong one silently disables the staleness check that the
// whole `MOVED SINCE` block rests on.
export const today = () => new Date().toISOString().slice(0, 10);

// What a shape is missing, as a list of complaints. Empty means it holds.
export function violations({ kind, fm, body }) {
  const shape = SHAPES[kind];
  if (!shape) return [`unknown kind: ${kind}`];
  const out = [];
  for (const k of ['touched', ...shape.keys]) {
    if (!(k in fm)) out.push(`no \`${k}:\` in the frontmatter`);
  }
  for (const line of shape.must ?? []) {
    if (!new RegExp(`^\\s*(?:\\*\\*)?${line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm').test(body)) {
      out.push(`no \`${line}\` line`);
    }
  }
  return out;
}
