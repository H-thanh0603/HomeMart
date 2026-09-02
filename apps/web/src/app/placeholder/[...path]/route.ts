import { NextRequest } from 'next/server';

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const PALETTES: [string, string][] = [
  ['#dbeafe', '#93c5fd'],
  ['#dcfce7', '#86efac'],
  ['#fef9c3', '#fde047'],
  ['#ffe4e6', '#fda4af'],
  ['#f3e8ff', '#d8b4fe'],
  ['#ccfbf1', '#5eead4'],
  ['#ffedd5', '#fdba74'],
];

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] ?? c,
  );
}

function wrapLines(title: string, maxChars: number, maxLines: number): string[] {
  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  const joined = lines.join(' ');
  if (words.join(' ').length > joined.length && lines.length > 0) {
    lines[lines.length - 1] = lines[lines.length - 1] + '…';
  }
  return lines.slice(0, maxLines);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const segments = Array.isArray(path) ? path : [];
  const fileName = decodeURIComponent(segments[segments.length - 1] ?? 'san-pham');
  const title = fileName
    .replace(/\.(jpg|jpeg|png|webp)$/i, '')
    .split(/[-_]+/)
    .filter(Boolean)
    .join(' ');

  const h = hashCode(fileName);
  const [from, to] = PALETTES[h % PALETTES.length];
  const gid = `g${h % 100000}`;
  const lines = wrapLines(title, 24, 2);
  const startY = 330 - (lines.length - 1) * 17;
  const tspans = lines
    .map((l, i) => `<tspan x="300" y="${startY + i * 34}">${escapeXml(l)}</tspan>`)
    .join('\n    ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#${gid})"/>
  <g opacity="0.35" transform="translate(258 118)">
    <path d="M42 8 L84 44 H72 V88 H12 V44 H0 Z M30 56 h24 v24 h-24 Z" fill="#ffffff"/>
  </g>
  <text font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="600"
        fill="#334155" text-anchor="middle">
    ${tspans}
  </text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
