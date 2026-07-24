/**
 * Gate start_game_change until a mockup image was shown (or the owner skips).
 */

const MOCKUP_RE =
  /docs\/design\/maps\/mockup-|raw\.githubusercontent\.com\/\S*mockup-/i;

const SKIP_RE =
  /just build|skip the (mockup|picture|image)|no (mockup|picture)|s[óo] constr[óo]i|constru(ir|[óo]i)\s+(logo|direto)|sem (mockup|imagem)/i;

/**
 * Flatten message contents (incl. tool results) into searchable text.
 * @param {Array<{ role?: string, content?: string }>} messages
 */
export function flattenMessageText(messages) {
  if (!Array.isArray(messages)) return '';
  const parts = [];
  for (const m of messages) {
    if (typeof m?.content === 'string' && m.content) parts.push(m.content);
  }
  return parts.join('\n');
}

/**
 * True when conversation already has a mockup reference, or a USER skip phrase.
 * @param {Array<{ role?: string, content?: string }>} messages
 */
export function mockupGateAllows(messages) {
  const all = flattenMessageText(messages);
  if (MOCKUP_RE.test(all)) return true;

  if (!Array.isArray(messages)) return false;
  for (const m of messages) {
    if (m?.role === 'user' && typeof m.content === 'string' && SKIP_RE.test(m.content)) {
      return true;
    }
  }
  return false;
}

export const MOCKUP_GATE_BLOCK = {
  ok: false,
  error: 'mockup_approval_required',
  hint:
    'First generate_map_image with referencePath docs/design/maps/town-current.png, show it, and get Approve — or the owner can say "just build it".',
};
