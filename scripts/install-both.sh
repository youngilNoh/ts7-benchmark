#!/usr/bin/env bash

npm install

ts7Output=$(npm run --silent ts7 -- -v)
ts6Output=$(npm run --silent ts6 -- -v)

echo "{ \"ts6\": \"${ts6Output#* }\", \"ts7\": \"${ts7Output#* }\" }"
