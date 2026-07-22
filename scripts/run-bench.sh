#!/usr/bin/env bash

if [ "$(uname)" = "Darwin" ]; then
  TIME_CMD="gtime"
else
  TIME_CMD="/usr/bin/time"
fi

mkdir -p results

for fixture in small medium large real-world; do
  if [ "$fixture" = "real-world" ]; then
    projectPath="fixtures/real-world/zod.tsconfig.bench.json"
  else
    projectPath="fixtures/synthetic/$fixture"
  fi

  # TS6 has no --checkers concept, so it's measured once per fixture instead
  # of once per checkers value (which used to just repeat ~the same number).
  echo "=== $fixture: TS6 (baseline, measured once) ==="
  hyperfine \
    --warmup 2 \
    --command-name "TS6" "npm run --silent ts6 -- --noEmit -p $projectPath" \
    --export-json "results/$fixture-ts6.json"
  $TIME_CMD -v npm run --silent ts6 -- --noEmit -p $projectPath 2> "results/$fixture-ts6-mem.txt"

  for checkers in 1 4 8; do
    echo "=== $fixture: TS7 checkers=$checkers ==="
    hyperfine \
      --warmup 2 \
      --command-name "TS7 (checkers=$checkers)" "npm run --silent ts7 -- --noEmit -p $projectPath --checkers $checkers" \
      --export-json "results/$fixture-ts7-checkers-$checkers.json"
    $TIME_CMD -v npm run --silent ts7 -- --noEmit -p $projectPath --checkers $checkers 2> "results/$fixture-checkers-$checkers-ts7-mem.txt"
  done
done
