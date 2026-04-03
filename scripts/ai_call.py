#!/usr/bin/env python3
"""
Drop-in replacement for: claude -p --model sonnet --output-format json
Reads prompt from stdin, calls Anthropic API directly, outputs {"result": "..."}
"""
import sys, json, urllib.request, os

api_key = os.environ.get('ANTHROPIC_API_KEY', '')
if not api_key:
    sys.exit(1)

prompt = sys.stdin.read()

payload = json.dumps({
    "model": "claude-sonnet-4-6",
    "max_tokens": 4096,
    "messages": [{"role": "user", "content": prompt}]
}).encode()

req = urllib.request.Request(
    "https://api.anthropic.com/v1/messages",
    data=payload,
    headers={
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
)

try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read())
        print(json.dumps({"result": result["content"][0]["text"]}))
except Exception:
    sys.exit(1)
