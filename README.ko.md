# TypeScript 7 vs 6 — 타입 체크 벤치마크

[🇺🇸 English](./README.md) | 🇰🇷 한국어

[![Benchmark](https://github.com/youngilNoh/ts7-benchmark/actions/workflows/benchmark.yml/badge.svg)](https://github.com/youngilNoh/ts7-benchmark/actions/workflows/benchmark.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Live demo](https://img.shields.io/badge/demo-GitHub%20Pages-2ea44f)](https://yesimnoh.github.io/ts7-benchmark/)

이 벤치마크는 네이티브 TypeScript 7 컴파일러가 TypeScript 6보다 타입 체크를 얼마나 빠르게 하는지를 실제로 확인합니다 — 인터넷에서 흔히 보는 "10배 빠르다" 같은 주장을 그대로 옮기는 대신에요. 합성(synthetic) fixture(크기를 조절해 생성)와 커밋 해시로 고정해둔 실제 오픈소스 프로젝트([zod](https://github.com/colinhacks/zod)) 양쪽에 `tsc --noEmit`을 돌려서 실행 시간과 최대 메모리 사용량을 기록합니다. TS7은 병렬로 타입 체크를 할 수 있어서, 새로 생긴 `--checkers` 옵션에 따라 결과가 어떻게 바뀌는지도 함께 봅니다. 수치는 GitHub Actions로 매주 자동 갱신되고 인터랙티브 대시보드에 올라갑니다.

**▶ 실시간 데모: https://yesimnoh.github.io/ts7-benchmark/**

![데모 대시보드](docs/demo.png)

---

## 목표

이 프로젝트의 목적은 TS7의 속도 주장을 그대로 믿는 게 아니라 직접 검증해보는 것입니다.:

- **재현 가능함** — clone하고 명령어 몇 개만 실행하면 비교 가능한 수치를 얻습니다. 컴파일러 버전은 고정되어 있고, 실제 프로젝트 fixture도 정확한 커밋에 고정되어 있습니다.
- **정직함** — 실제로 측정한 것(타입 체크만), 어떤 하드웨어에서, 몇 번 실행했는지를 그대로 보고합니다. 다루지 않는 부분은 [한계](#한계)에 적어뒀습니다.
- **규모를 고려함** — 4가지 fixture 크기와 3가지 `--checkers` 설정에 걸쳐 측정해서, 헤드라인 숫자 하나가 아니라 속도 향상이 실제로 어디서 오는지 볼 수 있습니다.

## 결과

TS7은 TS6보다 대략 **3~4배** 빠르게 타입 체크를 합니다. 이 향상분의 대부분은 `--checkers 1`에서 `--checkers 4`로 갈 때 나옵니다. 지금 CI 러너는 **CPU 코어가 4개뿐**이라, `--checkers 8`은 그 이상 별 도움이 안 되고 오히려 살짝 느려지기도 합니다 — 워커 8개를 다 바쁘게 돌릴 만큼 코어가 없는 거죠. 코어가 더 많은 머신이라면 이 한계선도 더 위로 올라갈 겁니다.

> [!TIP]
> 이건 [`--checkers` 이론](#왜-ts7에는---checkers-옵션이-있고-ts6에는-없는가)이 데이터에 그대로 드러난 재밌는 사례입니다: 체커 워커 수가 CPU 코어 수보다 많아지면 그 초과분은 동시에 돌아갈 수가 없어서 더 이상 도움이 안 되고, 오히려 약간의 오버헤드만 더할 수 있습니다. 지금 이 CI 러너는 코어가 4개뿐이라, 실제로 `--checkers 8`이 `--checkers 4`를 거의 못 이기고 종종 지기까지 합니다. 코어가 8개 이상인 머신에서 돌리면 이 한계선이 더 올라갈 겁니다.

합성 fixture는 상대적으로 작고 평평한 속도 향상을 보이는 반면, 복잡한 제네릭을 많이 쓰는 실제 프로젝트(zod)는 코어 수가 허락하는 한 checker를 늘릴수록 가장 큰 이득을 봅니다.

최신 수치, 인터랙티브 차트, 전체 데이터 테이블은 **[실시간 데모](https://yesimnoh.github.io/ts7-benchmark/)**에서 확인하세요.

원본 데이터는 [`results/`](./results/)에 있습니다. 대시보드가 읽는 병합된 파일은 [`results/summary.json`](./results/summary.json)이며, 그 구조는 [`scripts/collect-results.ts`](./scripts/collect-results.ts) 상단에 문서화되어 있습니다.

## 방법론

### 두 컴파일러

| 별칭 | 패키지 | 실행 방법 |
| --- | --- | --- |
| **TS7** | `typescript@7` (네이티브 / Go 컴파일러) | `npm run ts7 -- …` |
| **TS6** | `@typescript/typescript6` | `npm run ts6 -- …` |

두 컴파일러 모두 `npx tsc`가 아니라 `package.json`의 스크립트(`npm run ts6` / `npm run ts7`)로 실행합니다. 이유는: `@typescript/typescript6`을 설치하면 진짜 TypeScript 6이 함께 딸려 들어오는데, 그 TS6과 TypeScript 7 둘 다 `tsc`라는 실행 파일 이름을 쓰려고 합니다. `npx tsc`는 결국 그 이름 싸움에서 이긴 쪽(TS6)으로 실행돼버려서 믿을 수 없습니다. 대신 `ts6` / `ts7` 스크립트는 각 컴파일러를 경로로 직접 가리키니, 어느 쪽이 돌아가는지 헷갈릴 일이 없습니다.

### 왜 TS7에는 `--checkers` 옵션이 있고 TS6에는 없는가

TS7은 컴파일러를 Go로 다시 작성한 것입니다 (예전엔 *typescript-go*라고 불렸던 "네이티브" 컴파일러). 이렇게 바뀐 덕분에 병렬 타입 체크가 가능해졌습니다:

- TypeScript 5/6은 단일 스레드 자바스크립트 런타임 위에서 돌아가고, 타입 체커는 심볼·타입·추론 결과처럼 계속 바뀌는 거대한 상태 하나를 여러 곳에서 같이 씁니다. 자바스크립트 워커 스레드끼리는 메모리를 공유하지 않아서, 이 상태를 다른 스레드로 옮기려면 통째로 복사해야 하는데 그게 너무 느립니다. 그래서 여러 코어로 나눠서 검사하는 건 애초에 선택지가 아니었습니다.
- Go는 동시성(고루틴)을 저렴하게 쓸 수 있고 메모리도 공유하기 때문에, 네이티브 컴파일러는 같은 프로그램을 여러 체커 워커가 동시에 들여다볼 수 있습니다.

`--checkers N`은 정확히 이 부분을 노출하는 옵션입니다 — 병렬 체커 워커를 몇 개 쓸지 (기본값 `4`). 각 워커는 프로그램에 대해 자기만의 시각을 갖지만, 같은 입력 파일에 대해서는 항상 **결정론적으로** 일이 나뉩니다 — 그래서 checker 개수를 바꾸면 *속도와 메모리*만 바뀌지, 보고되는 에러 목록은 절대 바뀌지 않습니다. checker가 많을수록 코어를 더 쓰지만 메모리도 더 씁니다 (워커마다 자기 상태를 따로 들고 있으므로) — 그래서 메모리가 제한된 CI 환경에서는 흔히 `--checkers 1`로 고정합니다.

이 벤치마크는 모든 fixture에 대해 TS7을 `--checkers 1`, `4`, `8`로 각각 측정해서 확장 곡선(scaling curve)을 볼 수 있게 합니다. 이런 개념이 없는 TS6은 **fixture당 한 번만** 측정하고, 그 값을 세 checker 행 모두의 기준값(baseline)으로 재사용합니다.

### Fixture

- **합성(Synthetic)** (`small` / `medium` / `large`) — [`fixtures/synthetic/generate.ts`](./fixtures/synthetic/generate.ts)가 목표 줄 수에 도달할 때까지 무작위(하지만 유효한) interface와 제네릭 함수를 생성합니다. 크기는 총 줄 수 기준으로 정해집니다 (약 500 / 1만 5천 / 12만 줄).
- **실제 프로젝트(Real-world)** — [zod](https://github.com/colinhacks/zod)를 git submodule로 추가하고 커밋 `912f0f5`에 고정했습니다. zod 자체 설정을 그대로 상속하면서 사용하지 않는 변수 관련 lint 규칙 두 개만 끄는 작은 [`zod.tsconfig.bench.json`](./fixtures/real-world/zod.tsconfig.bench.json)으로 검사합니다 (zod의 테스트 파일들은 타입 검증만을 위한, 의도적으로 사용하지 않는 지역 변수를 선언합니다). zod의 소스 코드는 **일절 수정하지 않습니다.**

### 측정 방법

- **시간** — [`hyperfine`](https://github.com/sharkdp/hyperfine)으로 예열(warmup) 2회 + 실측 10회를 실행해, 평균/중앙값/표준편차를 기록합니다.
- **메모리** — GNU `time -v`로 측정한 최대 상주 메모리(peak resident set size, `Maximum resident set size`).
- **실행 환경** — 커밋된 수치는 GitHub Actions의 Ubuntu 러너에서 나온 것이며, 그 러너의 CPU/RAM 사양이 `summary.json`에 함께 기록되어 있어 결과만 봐도 어떤 환경인지 알 수 있습니다.

## 한계

아래 사항들을 감안하고 수치를 봐주세요:

1. **TS7은 아직 프리뷰입니다.** 네이티브 컴파일러는 아직 TypeScript API 전체나 모든 설정 옵션을 지원하지 않습니다. "지금 당장 그대로 대체 가능하다"가 아니라 "앞으로의 방향성"으로 봐주세요.
2. **CI 러너는 잡음(noise)이 있습니다.** GitHub Actions는 공유 가상머신을 쓰기 때문에 절대 시간은 실행마다 조금씩 달라집니다. 특정 순간의 밀리초 값 하나보다는 **비율과 추세**를 훨씬 더 신뢰해주세요. 정밀한 수치가 필요하면 조용한 개인 머신에서 직접 돌려보세요.
3. **합성 코드는 실제 코드가 아닙니다.** 생성된 fixture는 타입 선언의 "양"에 부하를 주는 것이지, 실제 애플리케이션의 지저분한 패턴을 재현하는 게 아닙니다. zod fixture가 포함된 이유가 바로 이것 — 합성 코드로는 모든 걸 대표할 수 없기 때문입니다.
4. **타입 체크만 측정합니다.** `tsc --noEmit`만 측정하며, 코드 산출(emit), 번들링, 증분 빌드, 에디터/언어 서버 지연시간은 측정하지 않습니다.
5. **한 번에 하나의 머신 사양만 반영합니다.** 한 번의 실행은 그 러너의 코어 수와 메모리만 반영합니다. 특히 `--checkers`에 따른 확장성은 사용 가능한 코어 수에 크게 좌우됩니다.

## 로컬에서 재현하기

**사전 준비물:** Node.js 24 이상(`.ts` 스크립트를 직접 실행하는 데 필요), [`hyperfine`](https://github.com/sharkdp/hyperfine), GNU `time` (macOS: `brew install gnu-time`로 `gtime` 설치, Linux는 기본 내장), [`pnpm`](https://pnpm.io/) (zod가 pnpm 워크스페이스라서 필요).

```bash
# 1. zod submodule까지 함께 clone
git clone --recurse-submodules https://github.com/youngilNoh/ts7-benchmark.git
cd ts7-benchmark

# 2. 두 컴파일러 설치 (설치된 { ts6, ts7 } 버전을 출력함)
./scripts/install-both.sh

# 3. 실제 프로젝트(zod) fixture의 의존성 설치
(cd fixtures/real-world/zod && pnpm install --filter zod...)

# 4. 합성 fixture 생성 (small / medium / large)
node fixtures/synthetic/generate.ts --files 10 --linesPerFile 50
node fixtures/synthetic/generate.ts --files 10 --linesPerFile 1500
node fixtures/synthetic/generate.ts --files 20 --linesPerFile 6000

# 5. 벤치마크 실행 (TS6은 fixture당 1회, TS7은 checkers 1/4/8 각각)
./scripts/run-bench.sh

# 6. 모든 결과를 results/summary.json으로 병합
node scripts/collect-results.ts
```

로컬 결과로 대시보드를 보려면:

```bash
cd site
npm install
npm run dev      # 출력된 http://localhost:5173 접속
```

## 저장소 구조

```
fixtures/
  synthetic/        generate.ts + 생성된 <size>/ 폴더들
  real-world/       zod (submodule) + zod.tsconfig.bench.json
scripts/
  install-both.sh   두 컴파일러 설치, 버전을 JSON으로 출력
  run-bench.sh      fixture × checkers 조합에 대해 hyperfine + 메모리 측정
  collect-results.ts  원본 결과를 results/summary.json으로 병합
results/            실행별 원본 JSON + 메모리 로그, 그리고 summary.json (CI가 커밋함)
site/               Vite 대시보드 (GitHub Pages에 배포됨)
.github/workflows/  benchmark.yml — 실행, 결과 커밋, 사이트 배포
```

## 자동화

[`benchmark.yml`](./.github/workflows/benchmark.yml)은 매주 정해진 일정에 실행되며(수동 실행도 가능), 러너 사양을 출력하고, 필요한 것들을 설치하고, fixture를 재생성하고, 벤치마크를 실행하고, 갱신된 `results/`를 커밋하고, 대시보드를 GitHub Pages에 배포합니다.

## 기여하기

기여를 환영합니다 — [CONTRIBUTING.md](./CONTRIBUTING.md)를 참고해주세요.

## 라이선스

[MIT](./LICENSE) © Charlie. 함께 포함된 zod fixture는 MIT 라이선스이며 저작권은 원 저자에게 있습니다.

## 감사의 말

- TypeScript 팀과 [네이티브 컴파일러](https://github.com/microsoft/typescript-go) 프로젝트
- [zod](https://github.com/colinhacks/zod) — 실제 프로젝트 fixture
- [hyperfine](https://github.com/sharkdp/hyperfine) — 벤치마크 실행 도구
