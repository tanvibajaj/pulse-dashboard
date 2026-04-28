#!/usr/bin/env python3
"""
Reads prompt from stdin, returns {"result": "..."}.
Uses local `claude` CLI (Claude Code subscription) — no API key needed.
"""
import sys, subprocess, os

CLAUDE = os.path.expanduser("~/.local/bin/claude")
if not os.path.exists(CLAUDE):
    CLAUDE = "claude"

prompt = sys.stdin.read()

try:
    proc = subprocess.run(
        [CLAUDE, "-p", "--model", "sonnet", "--output-format", "json"],
        input=prompt,
        capture_output=True,
        text=True,
        timeout=300,
    )
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr)
        sys.exit(1)
    sys.stdout.write(proc.stdout)
except Exception as e:
    sys.stderr.write(f"ai_call error: {e}\n")
    sys.exit(1)
