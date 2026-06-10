#!/usr/bin/env bash
# One-command start. Runs entirely on python3 stdlib in paper mode.
set -e
cd "$(dirname "$0")"

echo "==> initializing database"
python3 -m app.cli initdb

echo "==> seeding a simulated batch of orders + customer messages"
python3 -m app.cli simulate

echo "==> starting the live system (worker + dashboard)"
echo "    open the dashboard:  http://127.0.0.1:8787"
echo "    approve escalations there, or:  python3 -m app.cli escalations"
echo "    stop with Ctrl-C"
python3 -m app.cli run
