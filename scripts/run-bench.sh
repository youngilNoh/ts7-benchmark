#!/usr/bin/env bash

if [ "$(uname)" = "Darwin" ]; then
  TIME_CMD="gtime"
else
  TIME_CMD="/usr/bin/time"
fi

mkdir -p results

for fixture in small medium large real-world;do
    for checkers in 1 4 8; do
        echo "=== checkers: $checkers ==="
        if [ "$fixture" = "real-world" ]; then
            hyperfine \
                --warmup 2 \
                --command-name "TS6" "npm run --silent ts6 -- --noEmit -p fixtures/real-world/zod.tsconfig.bench.json" \
                --command-name "TS7 (checkers=$checkers)" "npm run --silent ts7 -- --noEmit -p fixtures/real-world/zod.tsconfig.bench.json --checkers $checkers" \
                --export-json "results/$fixture-bench-checkers-$checkers.json"
                $TIME_CMD -v npm run --silent ts6 -- --noEmit -p fixtures/real-world/zod.tsconfig.bench.json 2> "results/$fixture-checkers-ts6-mem.txt"
                $TIME_CMD -v npm run --silent ts7 -- --noEmit -p fixtures/real-world/zod.tsconfig.bench.json --checkers $checkers 2> "results/$fixture-checkers-$checkers-ts7-mem.txt"
        else
            hyperfine \
                --warmup 2 \
                --command-name "TS6" "npm run --silent ts6 -- --noEmit -p fixtures/synthetic/$fixture" \
                --command-name "TS7 (checkers=$checkers)" "npm run --silent ts7 -- --noEmit -p fixtures/synthetic/$fixture --checkers $checkers" \
                --export-json "results/$fixture-bench-checkers-$checkers.json"
                $TIME_CMD -v npm run --silent ts6 -- --noEmit -p fixtures/synthetic/$fixture 2> "results/$fixture-checkers-ts6-mem.txt"
                $TIME_CMD -v npm run --silent ts7 -- --noEmit -p fixtures/synthetic/$fixture --checkers $checkers 2> "results/$fixture-checkers-$checkers-ts7-mem.txt"
        fi
    done
done
