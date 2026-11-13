import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// UTF-8 text read as Windows-1252 and saved again turns an em dash into the three
// characters a-circumflex, euro sign, right quote; e-acute into A-tilde plus a
// symbol; and so on. Those pairs don't occur in real text, so finding one means a
// file went through the wrong encoding (PowerShell 5's Get-Content does this by
// default). Built from character codes so this file can't contain them itself.
const ch = (code: number) => String.fromCharCode(code);
const range = (from: number, to: number) => `[${ch(from)}-${ch(to)}]`;
const MOJIBAKE = new RegExp(
  [
    ch(0xe2) + ch(0x20ac), // start of a garbled dash, quote, ellipsis
    ch(0xe2) + ch(0x2020), // start of a garbled arrow
    ch(0xc3) + range(0x80, 0xbf), // a garbled accented letter
    ch(0xc2) + range(0xa0, 0xbf), // a garbled symbol or no-break space
    ch(0xe6) + ch(0x2014), // a garbled CJK character, as in the brief's title
  ].join('|'),
);
const TEXT = /\.(ts|js|json|md|css|html|txt|svg)$|^\.(gitattributes|prettierignore)$/;

describe('text files', () => {
  const files = execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .filter((path) => TEXT.test(path) && path !== 'package-lock.json');

  it('are found', () => {
    expect(files).toContain('CLAUDE.md');
  });

  it.each(files)('%s has no garbled characters', (path) => {
    const lines = readFileSync(path, 'utf8').split('\n');
    const bad = lines.flatMap((line, i) => (MOJIBAKE.test(line) ? [`${i + 1}: ${line}`] : []));
    expect(bad).toEqual([]);
  });
});
