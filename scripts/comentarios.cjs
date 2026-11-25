const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const ts = require('typescript');

const FIX = process.argv.includes('--fix');
const IGNORED = /(^|\/)(node_modules|dist|coverage)\/|routeTree\.gen\.ts$/;
const DIRECTIVE =
  /eslint-(disable|enable)|@ts-(expect-error|ignore|nocheck)|^\/\/\/\s*<reference|@vite-ignore|__PURE__|prettier-ignore|Stryker (disable|restore)/;

function scriptKind(file) {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (/\.(c|m)?js$/.test(file)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function codeRanges(file, text) {
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file),
  );
  const found = new Map();
  const add = (list) =>
    (list ?? []).forEach((c) => found.set(c.pos, { pos: c.pos, end: c.end }));
  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.JsxText) return;
    if (
      node.kind === ts.SyntaxKind.JsxExpression &&
      !node.expression &&
      !node.dotDotDotToken
    ) {
      found.set(node.pos, { pos: node.getStart(source), end: node.end });
      return;
    }
    const children = node.getChildren(source);
    if (children.length > 0) {
      children.forEach(visit);
      return;
    }
    add(ts.getLeadingCommentRanges(text, node.pos));
    add(ts.getTrailingCommentRanges(text, node.end));
  };
  visit(source);
  return [...found.values()];
}

function cssRanges(text) {
  return [...text.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => ({
    pos: m.index,
    end: m.index + m[0].length,
  }));
}

function lineRanges(text, pattern) {
  const ranges = [];
  let offset = 0;
  text.split('\n').forEach((line, index) => {
    const match = pattern.exec(line);
    if (match && !(index === 0 && line.startsWith('#!'))) {
      ranges.push({ pos: offset + match.index, end: offset + line.length });
    }
    offset += line.length + 1;
  });
  return ranges;
}

function rangesFor(file, text) {
  if (/\.(ts|tsx|js|mjs|cjs)$/.test(file)) return codeRanges(file, text);
  if (file.endsWith('.css')) return cssRanges(text);
  if (file.endsWith('.prisma')) {
    return lineRanges(text, /^\s*\/\/.*$|\s+\/\/(?=[^"]*$).*$/);
  }
  if (/\.(ya?ml|sh)$/.test(file)) return lineRanges(text, /^\s*#.*$/);
  return [];
}

function remove(text, ranges) {
  let result = text;
  for (const { pos, end } of [...ranges].sort((a, b) => b.pos - a.pos)) {
    const lineStart = result.lastIndexOf('\n', pos - 1) + 1;
    const nextBreak = result.indexOf('\n', end);
    const lineEnd = nextBreak === -1 ? result.length : nextBreak;
    const alone =
      result.slice(lineStart, pos).trim() === '' &&
      result.slice(end, lineEnd).trim() === '';
    result = alone
      ? result.slice(0, lineStart) + result.slice(Math.min(lineEnd + 1, result.length))
      : result.slice(0, pos).replace(/[ \t]+$/, (s) => (result.slice(end, lineEnd).trim() ? s : '')) +
        result.slice(end);
  }
  return result.replace(/^\n+/, '');
}

const files = execSync(
  "git ls-files '*.ts' '*.tsx' '*.js' '*.mjs' '*.cjs' '*.css' '*.prisma' '*.sh' '*.yml' '*.yaml'",
)
  .toString()
  .trim()
  .split('\n')
  .filter((file) => file && !IGNORED.test(file) && fs.existsSync(file));

let total = 0;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const ranges = rangesFor(file, text).filter(
    ({ pos, end }) => !DIRECTIVE.test(text.slice(pos, end)),
  );
  if (ranges.length === 0) continue;
  total += ranges.length;
  if (FIX) {
    fs.writeFileSync(file, remove(text, ranges));
    continue;
  }
  for (const { pos } of ranges) {
    const line = text.slice(0, pos).split('\n').length;
    console.log(`${path.normalize(file)}:${line}`);
  }
}

if (FIX) {
  console.log(`${total} comentarios quitados.`);
} else if (total > 0) {
  console.error(
    `${total} comentarios en el código. Llévalos a docs/ y ejecuta: npm run comentarios -- --fix`,
  );
  process.exit(1);
} else {
  console.log('Sin comentarios en el código.');
}
