// Shared text helpers for normalizing job descriptions from various APIs.

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  hellip: "...",
  mdash: "-",
  ndash: "-",
  rsquo: "'",
  lsquo: "'",
  ldquo: '"',
  rdquo: '"',
};

// Decode a single pass of HTML entities (named + numeric, decimal and hex).
export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const num =
        code[1]?.toLowerCase() === "x"
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isNaN(num) ? m : String.fromCodePoint(num);
    }
    const named = NAMED_ENTITIES[code.toLowerCase()];
    return named ?? m;
  });
}

// Convert (possibly entity-encoded) HTML to clean plain text. Some sources
// (e.g. Greenhouse) double-encode their content, so we decode, strip tags, then
// decode again before collapsing whitespace.
export function htmlToText(s: string): string {
  const decoded = decodeEntities(s);
  const stripped = decoded.replace(/<[^>]*>/g, " ");
  return decodeEntities(stripped).replace(/\s+/g, " ").trim();
}
