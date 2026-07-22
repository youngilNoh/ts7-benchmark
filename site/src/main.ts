import './style.css';

interface VersionStats {
  meanSec: number;
  medianSec: number;
  stddevSec: number;
  memoryKb: number;
}

interface ResultEntry {
  fixture: string;
  checkers: number;
  ts6: VersionStats;
  ts7: VersionStats;
}

interface Summary {
  meta: {
    generatedAt: string;
    ts6Version: string;
    ts7Version: string;
    runner: {
      platform: string;
      arch: string;
      cpuModel: string;
      cpuCount: number;
      totalMemoryMb: number;
    };
  };
  results: ResultEntry[];
}

const FIXTURE_ORDER = ['small', 'medium', 'large', 'real-world'];
const FIXTURE_COLORS: Record<string, string> = {
  small: '#8b919c',
  medium: '#a4c9ff',
  large: '#44e2cd',
  'real-world': '#ffb4ab',
};
const CHECKERS_VALUES = [1, 4, 8];
const DEFAULT_CHECKERS = 4;

const speedup = (e: ResultEntry) => e.ts6.meanSec / e.ts7.meanSec;

const formatSec = (s: number) => (s >= 10 ? `${s.toFixed(1)}s` : `${s.toFixed(2)}s`);
const formatMb = (kb: number) => Math.round(kb / 1024).toLocaleString('en-US');

function sortResults(results: ResultEntry[]): ResultEntry[] {
  return [...results].sort(
    (a, b) =>
      FIXTURE_ORDER.indexOf(a.fixture) - FIXTURE_ORDER.indexOf(b.fixture) ||
      a.checkers - b.checkers,
  );
}

function renderTimestampBadge(meta: Summary['meta']): void {
  const formatted = meta.generatedAt.replace('T', ' ').split('.')[0] + ' UTC';
  document.getElementById('timestamp-badge')!.textContent = formatted;
}

function renderHero(data: Summary): void {
  const best = data.results.reduce((a, b) => (speedup(a) >= speedup(b) ? a : b));
  document.getElementById('hero-speedup')!.textContent = `${speedup(best).toFixed(1)}x`;
  document.getElementById('hero-speedup-caption')!.textContent =
    `Faster on the ${best.fixture} fixture (--checkers ${best.checkers})`;
  document.getElementById('hero-versions')!.textContent =
    `TS ${data.meta.ts7Version} vs TS ${data.meta.ts6Version}`;
}

function renderBarChart(data: Summary, checkers: number): void {
  const entries = sortResults(data.results.filter(e => e.checkers === checkers));
  const maxSec = Math.max(...entries.flatMap(e => [e.ts6.meanSec, e.ts7.meanSec]));

  const bar = (cls: string, sec: number) => `
    <div class="bar">
      <div class="bar-value">${formatSec(sec)}</div>
      <div class="bar-fill ${cls}" style="height: ${(sec / maxSec) * 82}%"></div>
    </div>`;

  document.getElementById('bar-chart')!.innerHTML = entries
    .map(
      e => `
      <div class="bar-group" title="TS6 ${formatSec(e.ts6.meanSec)} vs TS7 ${formatSec(e.ts7.meanSec)} — ${speedup(e).toFixed(2)}x">
        <div class="bar-pair">${bar('ts6', e.ts6.meanSec)}${bar('ts7', e.ts7.meanSec)}</div>
        <span class="bar-label">${e.fixture}</span>
      </div>`,
    )
    .join('');
}

function renderCheckersSelector(data: Summary): void {
  const container = document.getElementById('checkers-select')!;
  container.innerHTML = CHECKERS_VALUES.map(
    c =>
      `<button type="button" data-checkers="${c}" class="${c === DEFAULT_CHECKERS ? 'active' : ''}">--checkers ${c}</button>`,
  ).join('');

  container.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest('button');
    if (!button) return;
    container.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === button));
    renderBarChart(data, Number(button.dataset.checkers));
  });
}

function renderLineChart(data: Summary): void {
  const W = 440;
  const H = 260;
  const pad = { top: 16, right: 16, bottom: 48, left: 44 };

  const sorted = sortResults(data.results);
  const speedups = sorted.map(speedup);
  const yMin = 1;
  const yMax = Math.ceil(Math.max(...speedups)) + 0.5;

  const x = (i: number) => pad.left + (i * (W - pad.left - pad.right)) / (CHECKERS_VALUES.length - 1);
  const y = (v: number) => H - pad.bottom - ((v - yMin) / (yMax - yMin)) * (H - pad.top - pad.bottom);

  const gridLines: string[] = [];
  for (let v = yMin; v <= yMax; v++) {
    gridLines.push(
      `<line x1="${pad.left}" x2="${W - pad.right}" y1="${y(v)}" y2="${y(v)}" stroke="#1e293b" stroke-width="1"/>`,
      `<text x="${pad.left - 8}" y="${y(v) + 4}" fill="#8b919c" font-family="JetBrains Mono" font-size="10" text-anchor="end">${v}x</text>`,
    );
  }

  const series = FIXTURE_ORDER.map(fixture => {
    const color = FIXTURE_COLORS[fixture];
    const points = CHECKERS_VALUES.map((c, i) => {
      const entry = sorted.find(e => e.fixture === fixture && e.checkers === c)!;
      return { px: x(i), py: y(speedup(entry)) };
    });
    const polyline = points.map(p => `${p.px},${p.py}`).join(' ');
    const dots = points
      .map(p => `<circle cx="${p.px}" cy="${p.py}" r="4" fill="${color}"/>`)
      .join('');
    return `<polyline fill="none" points="${polyline}" stroke="${color}" stroke-width="2.5"/>${dots}`;
  }).join('');

  const xLabels = CHECKERS_VALUES.map(
    (c, i) =>
      `<text x="${x(i)}" y="${H - pad.bottom + 18}" fill="#c1c7d3" font-family="JetBrains Mono" font-size="10" text-anchor="middle">${c}</text>`,
  ).join('');
  const axisLabel = `<text x="${W - pad.right}" y="${H - pad.bottom + 34}" fill="#8b919c" font-family="JetBrains Mono" font-size="10" text-anchor="end">--checkers</text>`;

  const legend = FIXTURE_ORDER.map(
    f =>
      `<span class="legend-item"><span class="swatch" style="background:${FIXTURE_COLORS[f]}"></span>${f}</span>`,
  ).join('');

  document.getElementById('line-chart')!.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Speedup by checkers count">
      ${gridLines.join('')}${series}${xLabels}${axisLabel}
    </svg>
    <div class="legend" style="margin-top: 8px">${legend}</div>`;

  const best = sorted.reduce((a, b) => (speedup(a) >= speedup(b) ? a : b));
  document.getElementById('line-chart-callout')!.textContent =
    `Peak speedup: ${speedup(best).toFixed(2)}x on ${best.fixture} with --checkers ${best.checkers}.`;
}

function renderTable(data: Summary): void {
  const versionRow = (e: ResultEntry, label: 'ts6' | 'ts7') => {
    const stats = e[label];
    const versionText =
      label === 'ts7' ? `TS ${data.meta.ts7Version}` : `TS ${data.meta.ts6Version}`;
    return `
      <tr>
        <td>${e.fixture}</td>
        <td>${label === 'ts7' ? e.checkers : '—'}</td>
        <td><span class="version-badge ${label}">${versionText}</span></td>
        <td>${formatSec(stats.meanSec)}</td>
        <td>${formatSec(stats.medianSec)}</td>
        <td class="stddev">±${stats.stddevSec.toFixed(3)}s</td>
        <td>${formatMb(stats.memoryKb)}</td>
      </tr>`;
  };

  document.getElementById('results-tbody')!.innerHTML = sortResults(data.results)
    .map(e => versionRow(e, 'ts6') + versionRow(e, 'ts7'))
    .join('');
}

function setupCsvExport(data: Summary): void {
  document.getElementById('export-csv')!.addEventListener('click', () => {
    const header = 'fixture,checkers,version,mean_sec,median_sec,stddev_sec,memory_kb';
    const rows = sortResults(data.results).flatMap(e =>
      (['ts6', 'ts7'] as const).map(v =>
        [
          e.fixture,
          e.checkers,
          v === 'ts7' ? data.meta.ts7Version : data.meta.ts6Version,
          e[v].meanSec,
          e[v].medianSec,
          e[v].stddevSec,
          e[v].memoryKb,
        ].join(','),
      ),
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ts7-benchmark-results.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

function renderInfoCards(meta: Summary['meta']): void {
  const r = meta.runner;
  document.getElementById('runner-info')!.innerHTML =
    `${r.cpuModel}<br/>${r.cpuCount} cores, ${Math.round(r.totalMemoryMb / 1024)} GB RAM<br/>${r.platform}/${r.arch}`;
  document.getElementById('compiler-info')!.innerHTML =
    `TypeScript ${meta.ts7Version} (native, --checkers 1/4/8)<br/>TypeScript ${meta.ts6Version}<br/>Fixtures: synthetic ×3 + zod (pinned)`;
}

async function main(): Promise<void> {
  try {
    const response = await fetch('./summary.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: Summary = await response.json();
    console.log('Loaded benchmark summary:', data);

    renderTimestampBadge(data.meta);
    renderHero(data);
    renderCheckersSelector(data);
    renderBarChart(data, DEFAULT_CHECKERS);
    renderLineChart(data);
    renderTable(data);
    setupCsvExport(data);
    renderInfoCards(data.meta);
    document.getElementById('footer-copy')!.textContent =
      `© ${new Date().getFullYear()} ts7-benchmark · MIT License`;
  } catch (error) {
    console.error('Failed to load summary.json:', error);
    document.getElementById('load-error')!.hidden = false;
  }
}

main();
