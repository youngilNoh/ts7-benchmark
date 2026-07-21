import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const RESULTS_ROOT = 'results/';

/**
 * Schema for results/summary.json:
 *
 * {
 *   meta: {
 *     ts6Version: string,   // installed typescript@6 version, e.g. "6.0.3"
 *     ts7Version: string,   // installed typescript@7 version, e.g. "7.0.2"
 *     runner: {
 *       platform: string,       // os.platform(), e.g. "darwin"
 *       arch: string,           // os.arch(), e.g. "arm64"
 *       cpuModel: string,
 *       cpuCount: number,
 *       totalMemoryMb: number,
 *     },
 *   },
 *   results: Array<{
 *     fixture: string,      // "small" | "medium" | "large" | "real-world"
 *     checkers: number,     // 1 | 4 | 8
 *     ts6: { meanSec: number, medianSec: number, stddevSec: number, memoryKb: number },
 *     ts7: { meanSec: number, medianSec: number, stddevSec: number, memoryKb: number },
 *   }>,
 * }
 */

function getCompilerVersion(npmScript: 'ts6' | 'ts7'): string {
  const output = execSync(`npm run --silent ${npmScript} -- -v`, { encoding: 'utf8' });
  return output.trim().replace(/^Version /, '');
}

function getRunnerSpec() {
  const cpus = os.cpus();
  return {
    platform: os.platform(),
    arch: os.arch(),
    cpuModel: cpus[0]?.model ?? 'unknown',
    cpuCount: cpus.length,
    totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
  };
}

function summarizeTime(hyperfineEntry: any) {
  return {
    meanSec: hyperfineEntry.mean,
    medianSec: hyperfineEntry.median,
    stddevSec: hyperfineEntry.stddev,
  };
}

function extractMemoryKb(filePath: string): number {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/Maximum resident set size \(kbytes\): (\d+)/);
  if (!match) {
    throw new Error(`Could not find memory usage in ${filePath}`);
  }
  return Number(match[1]);
}

function parseHyperfineFilename(filename: string): { fixture: string; checkers: number } {
  const match = filename.match(/^(.+)-bench-checkers-(\d+)\.json$/);
  if (!match) {
    throw new Error(`Unexpected hyperfine result filename: ${filename}`);
  }
  return { fixture: match[1], checkers: Number(match[2]) };
}

function collectResults() {
  const allFileList = fs.readdirSync(RESULTS_ROOT)
  const hyperfineResults = allFileList.filter(file => /-bench-checkers-\d+\.json$/.test(file))

  const results = hyperfineResults.map(filename => {
    const { fixture, checkers } = parseHyperfineFilename(filename);

    const hyperfineData = JSON.parse(fs.readFileSync(path.join(RESULTS_ROOT, filename), 'utf8'));
    const ts6Time = hyperfineData.results.find((r: any) => r.command === 'TS6');
    const ts7Time = hyperfineData.results.find((r: any) => r.command.startsWith('TS7'));

    const ts6MemoryKb = extractMemoryKb(path.join(RESULTS_ROOT, `${fixture}-checkers-ts6-mem.txt`));
    const ts7MemoryKb = extractMemoryKb(path.join(RESULTS_ROOT, `${fixture}-checkers-${checkers}-ts7-mem.txt`));

    return {
      fixture,
      checkers,
      ts6: { ...summarizeTime(ts6Time), memoryKb: ts6MemoryKb },
      ts7: { ...summarizeTime(ts7Time), memoryKb: ts7MemoryKb },
    };
  });

  const summary = {
    meta: {
      ts6Version: getCompilerVersion('ts6'),
      ts7Version: getCompilerVersion('ts7'),
      runner: getRunnerSpec(),
    },
    results,
  };

  fs.writeFileSync(path.join(RESULTS_ROOT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(`Wrote ${results.length} combined results to results/summary.json`);
}

collectResults();
