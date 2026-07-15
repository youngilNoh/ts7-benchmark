import { parseArgs } from 'node:util';
import fs from 'node:fs';

const FIELD_NAMES = ['longblack', 'latte', 'cappuccino', 'mocha', 'magic', 'piccolo'];
const FIELD_TYPES = ['number', 'boolean', 'string'];
const FUNCTION_NAMES = ['Victoria', 'Queensland', 'NewSouthWales', 'Tasmania'];
const GENERIC_TEMPLATES = [
  '(x: T): T[] { return [x]; }',
  '(x: T): T { return x; }',
  '(x: T, y: T): T[] { return [x, y]; }',
];

const MAX_FIELDS_PER_INTERFACE = 5;

const MEDIUM_TOTAL_LINES = 10_000;
const LARGE_TOTAL_LINES = 100_000;

const OUTPUT_ROOT = 'fixtures/synthetic';
const TSCONFIG_CONTENT = JSON.stringify(
  { compilerOptions: {}, include: ['*.ts'] },
  null,
  2,
);

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomIntBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function countLines(text: string): number {
  return text.split('\n').length;
}

interface Options {
  files: number;
  linesPerFile: number;
}

function toPositiveInt(raw: string | undefined, flag: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flag} must be a positive integer (e.g. ${flag} 10), got: ${raw}`);
  }
  return value;
}

function parseOptions(): Options {
  const { values } = parseArgs({
    options: {
      files: { type: 'string' },
      linesPerFile: { type: 'string' },
    },
  });
  return {
    files: toPositiveInt(values.files, '--files'),
    linesPerFile: toPositiveInt(values.linesPerFile, '--linesPerFile'),
  };
}

let nameCounter = 0;

function generateInterface(): string {
  const fieldCount = randomIntBetween(1, MAX_FIELDS_PER_INTERFACE);
  const fields: string[] = [];
  for (let i = 0; i < fieldCount; i++) {
    fields.push(`  ${pickRandom(FIELD_NAMES)}${i}: ${pickRandom(FIELD_TYPES)};`);
  }
  return `interface Interface${nameCounter++} {\n${fields.join('\n')}\n}`;
}

function generateGeneric(): string {
  return `function ${pickRandom(FUNCTION_NAMES)}${nameCounter++}<T>${pickRandom(GENERIC_TEMPLATES)}`;
}

function generateFileContent(targetLines: number): string {
  const chunks: string[] = [];
  let lineCount = 0;
  while (lineCount < targetLines) {
    const iface = generateInterface();
    const fn = generateGeneric();
    chunks.push(iface, fn);
    lineCount += countLines(iface) + countLines(fn);
  }
  return chunks.join('\n');
}

function classifySize(totalLines: number): 'small' | 'medium' | 'large' {
  if (totalLines > LARGE_TOTAL_LINES) return 'large';
  if (totalLines > MEDIUM_TOTAL_LINES) return 'medium';
  return 'small';
}

function writeFixtureFiles(options: Options): void {
  const size = classifySize(options.files * options.linesPerFile);
  const outputDir = `${OUTPUT_ROOT}/${size}`;

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(`${outputDir}/tsconfig.json`, TSCONFIG_CONTENT);

  for (let i = 0; i < options.files; i++) {
    fs.writeFileSync(`${outputDir}/file_${i}.ts`, generateFileContent(options.linesPerFile));
  }

  console.log(
    `Generated ${options.files} file(s) in ${outputDir}/ (~${options.linesPerFile} lines each, size: ${size}).`,
  );
}

writeFixtureFiles(parseOptions());
