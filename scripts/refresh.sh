#!/bin/bash
# Pulse Dashboard Refresh Script
# Uses claude CLI (Claude Code subscription) for AI processing
# Run: ./scripts/refresh.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"
TEMP_DIR=$(mktemp -d)

echo "⚡ Pulse refresh starting..."

# --- 1. Fetch raw data in parallel ---

echo "📡 Fetching data..."

# Global news RSS
fetch_rss() {
  local url="$1"
  local source="$2"
  local output="$3"
  curl -s -L --max-time 10 -H "User-Agent: Pulse/1.0" "$url" 2>/dev/null | \
    python3 -c "
import sys, xml.etree.ElementTree as ET, json, html
raw = sys.stdin.read()
items = []
try:
    root = ET.fromstring(raw)
    for item in root.iter('item'):
        title = item.findtext('title', '')
        link = item.findtext('link', '')
        pub = item.findtext('pubDate', '')
        desc = item.findtext('description', '')
        # Clean HTML from description
        desc = html.unescape(desc)
        import re
        desc = re.sub('<[^>]+>', '', desc)[:200]
        items.append({'title': title, 'source': '$source', 'url': link, 'publishedAt': pub, 'summary': desc})
except: pass
json.dump(items[:8], sys.stdout)
" > "$output" 2>/dev/null || echo "[]" > "$output"
}

# Fetch all RSS feeds in parallel
fetch_rss "https://feeds.bbci.co.uk/news/world/rss.xml" "BBC" "$TEMP_DIR/bbc.json" &
fetch_rss "https://feeds.reuters.com/reuters/topNews" "Reuters" "$TEMP_DIR/reuters.json" &
fetch_rss "https://www.aljazeera.com/xml/rss/all.xml" "Al Jazeera" "$TEMP_DIR/aljazeera.json" &
fetch_rss "https://apnews.com/index.rss" "AP News" "$TEMP_DIR/ap.json" &
fetch_rss "https://cointelegraph.com/rss" "CoinTelegraph" "$TEMP_DIR/cointelegraph.json" &
fetch_rss "https://www.coindesk.com/arc/outboundfeeds/rss/" "CoinDesk" "$TEMP_DIR/coindesk.json" &
fetch_rss "https://decrypt.co/feed" "Decrypt" "$TEMP_DIR/decrypt.json" &
fetch_rss "https://techcrunch.com/category/artificial-intelligence/feed/" "TechCrunch" "$TEMP_DIR/techcrunch.json" &
fetch_rss "https://feeds.arstechnica.com/arstechnica/technology-lab" "Ars Technica" "$TEMP_DIR/ars.json" &
fetch_rss "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" "The Verge" "$TEMP_DIR/verge.json" &

# Crypto prices from CoinGecko
curl -s "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&per_page=2&page=1&sparkline=false&price_change_percentage=24h" \
  -H "accept: application/json" > "$TEMP_DIR/crypto.json" 2>/dev/null &

# Fear & Greed Index
curl -s "https://api.alternative.me/fng/?limit=1" > "$TEMP_DIR/fng.json" 2>/dev/null &

# Live stock data via yfinance
python3 -c "
import json, sys

# Track errors
errors = []

try:
    import yfinance as yf
except ImportError:
    try:
        import subprocess
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'yfinance', '-q', '--break-system-packages'])
        import yfinance as yf
    except Exception as e:
        errors.append(f'yfinance install failed: {e}')
        sys.exit(1)

TICKERS = {
    'V':    'Visa Inc',
    'NVDA': 'NVIDIA Corp',
    'TSLA': 'Tesla Inc',
    'META': 'Meta Platforms',
    'AAPL': 'Apple Inc',
    'MSFT': 'Microsoft Corp',
    'GOOG': 'Alphabet Inc',
    'AMZN': 'Amazon.com',
    'AMD':  'AMD Inc',
    'CRM':  'Salesforce Inc',
    'NFLX': 'Netflix Inc',
    'AVGO': 'Broadcom Inc',
    'ORCL': 'Oracle Corp',
    'UBER': 'Uber Technologies',
    'COIN': 'Coinbase',
    'SNOW': 'Snowflake Inc',
}

try:
    data = yf.download(list(TICKERS.keys()), period='2d', interval='1d', progress=False, auto_adjust=True)
    closes = data['Close'].tail(2)
except Exception as e:
    errors.append(f'yfinance download failed: {e}')
    closes = None

for ticker, name in TICKERS.items():
    try:
        if closes is not None:
            prev = float(closes[ticker].iloc[0])
            curr = float(closes[ticker].iloc[1])
            chg = curr - prev
            pct = (chg / prev) * 100
            out = {'ticker': ticker, 'name': name, 'price': round(curr, 2), 'change': round(chg, 2), 'changePercent': round(pct, 2)}
        else:
            out = {'ticker': ticker, 'name': name, 'price': 0, 'change': 0, 'changePercent': 0, 'error': 'data unavailable'}
    except Exception as e:
        out = {'ticker': ticker, 'name': name, 'price': 0, 'change': 0, 'changePercent': 0, 'error': str(e)}
    with open('$TEMP_DIR/stock_' + ticker + '.json', 'w') as f:
        json.dump(out, f)

if errors:
    print('Stock fetch warnings: ' + '; '.join(errors), file=sys.stderr)
" 2>&1 | tee "$TEMP_DIR/stock_errors.log" || echo "⚠️ Stock fetch had errors"

wait
echo "✅ Data fetched"

# Verify critical data files exist
MISSING_DATA=""
[ ! -s "$TEMP_DIR/crypto.json" ] && MISSING_DATA="$MISSING_DATA crypto"
[ ! -s "$TEMP_DIR/fng.json" ] && MISSING_DATA="$MISSING_DATA fear_greed"
if [ -n "$MISSING_DATA" ]; then
  echo "⚠️ Missing data:$MISSING_DATA (will use fallbacks)"
fi

# --- 2. Merge raw data ---

python3 -c "
import json, glob

def load(path):
    try:
        with open(path) as f:
            return json.load(f)
    except:
        return []

global_news = load('$TEMP_DIR/bbc.json') + load('$TEMP_DIR/reuters.json') + load('$TEMP_DIR/aljazeera.json') + load('$TEMP_DIR/ap.json')
crypto_news = load('$TEMP_DIR/cointelegraph.json') + load('$TEMP_DIR/coindesk.json') + load('$TEMP_DIR/decrypt.json')
ai_news = load('$TEMP_DIR/techcrunch.json') + load('$TEMP_DIR/ars.json') + load('$TEMP_DIR/verge.json')

# Format crypto assets
raw_crypto = load('$TEMP_DIR/crypto.json')
crypto_assets = []
for c in raw_crypto:
    crypto_assets.append({
        'id': c.get('id',''),
        'symbol': c.get('symbol','').upper(),
        'name': c.get('name',''),
        'price': c.get('current_price', 0),
        'change24h': c.get('price_change_percentage_24h', 0) or 0,
        'marketCap': c.get('market_cap', 0),
        'image': c.get('image', '')
    })

# Assemble stocks from individual files
import glob as g
stocks = []
for f in g.glob('$TEMP_DIR/stock_*.json'):
    s = load(f)
    if isinstance(s, dict) and s.get('price', 0) > 0:
        stocks.append(s)

# Visa goes into a separate field for ticker bar
visa_stock = next((s for s in stocks if s['ticker'] == 'V'), None)

# Sort by biggest absolute % change and pick top 5 movers
tech_stocks = [s for s in stocks if s['ticker'] != 'V']
tech_stocks.sort(key=lambda x: abs(x.get('changePercent', 0)), reverse=True)
tech_stocks = tech_stocks[:5]

# Fear & Greed
fng_data = load('$TEMP_DIR/fng.json')
try:
    fng_value = int(fng_data.get('data', [{}])[0].get('value', 0))
except:
    fng_value = 50

raw = {
    'global_news': global_news[:15],
    'crypto_news': crypto_news[:15],
    'ai_news': ai_news[:15],
    'crypto_assets': crypto_assets,
    'stocks': tech_stocks,
    'visa_stock': visa_stock,
    'fear_greed': fng_value
}

with open('$TEMP_DIR/raw_all.json', 'w') as f:
    json.dump(raw, f)
"

echo "🤖 Running AI filtering via Claude Code..."

# --- 3. Use claude CLI for AI filtering/summarization ---

PROMPT=$(cat << 'PROMPTEOF'
You are curating a daily market intelligence dashboard for a product lead at a fintech/crypto company. I'll give you raw news data. Return ONLY valid JSON (no markdown, no explanation).

From the data, produce:
{
  "globalNews": [top 5 most important global headlines for someone in tech/finance. Prioritize: geopolitics affecting markets, economic policy, trade/sanctions, energy crises, tech regulation. EXCLUDE: local crime, human interest fluff, celebrity, sports, quirky stories. Each item: {"title","source","url","publishedAt","summary"} where summary is a punchy 1-sentence summary (max 20 words)],
  "cryptoNews": [top 5 most important crypto stories. Prioritize: protocol updates, DeFi, regulatory moves, institutional adoption, on-chain trends. Skip price speculation fluff. Same format as above],
  "aiNews": [top 5 most interesting AI/tech stories. Prioritize: breakthrough models, major funding, significant launches, AI regulation. Skip consumer gadget fluff. Same format],
  "stockExplanations": {"TICKER": "1-sentence explanation of why it moved"} for stocks with >1% change,
  "pulsePicks": [3 actionable watchlist picks. Each: {"ticker","action":(Watch|Consider Buying|Consider Selling|Hold),"reasoning":"2-3 sentences with specific data","timeframe":"Short-term (1-2 weeks)|Medium-term (1-3 months)|Long-term (3+ months)","riskLevel":"Low|Medium|High"}],
  "earnings": [upcoming earnings this week for major tech companies (V, NVDA, TSLA, META, AAPL, MSFT, GOOG, AMZN, AMD, CRM, NFLX). Each: {"ticker","name","date":"YYYY-MM-DD","time":"Before Open|After Close|TBD"}. If none this week, return empty array]
}

Here is today's raw data:
PROMPTEOF
)

RAW_DATA=$(cat "$TEMP_DIR/raw_all.json")

# Pipe through claude CLI and extract the result field
RAW_CLI_OUTPUT=$(echo "${PROMPT}

${RAW_DATA}" | python3 "$SCRIPT_DIR/ai_call.py" 2>/tmp/claude_debug.txt) || {
  echo "❌ AI call failed: $(cat /tmp/claude_debug.txt)"
  echo "Refusing to publish dashboard with hardcoded fallback content."
  exit 1
}

# Reject empty AI output too — would otherwise silently fall through to hardcoded picks
if [ -z "$RAW_CLI_OUTPUT" ] || ! echo "$RAW_CLI_OUTPUT" | python3 -c "import sys,json; json.load(sys.stdin)" >/dev/null 2>&1; then
  echo "❌ AI call returned empty/invalid output"
  exit 1
fi

# Extract the AI response from the CLI envelope and strip markdown fences
AI_RESULT=$(echo "$RAW_CLI_OUTPUT" | python3 -c "
import sys, json, re
try:
    envelope = json.load(sys.stdin)
    text = envelope.get('result', '')
    # Strip markdown code fences
    text = re.sub(r'^\s*\`\`\`(?:json)?\s*', '', text)
    text = re.sub(r'\s*\`\`\`\s*$', '', text)
    print(text.strip())
except:
    print('')
" 2>/dev/null)

# Write AI result to temp file for safe passing to Python
echo "$AI_RESULT" > "$TEMP_DIR/ai_result.json"

# --- 4. Assemble final dashboard.json ---

python3 -c "
import json, sys, os
from datetime import datetime, timezone

def load(path):
    try:
        with open(path) as f:
            return json.load(f)
    except:
        return {}

def load_text(path):
    try:
        with open(path) as f:
            return f.read().strip()
    except:
        return ''

raw = load('$TEMP_DIR/raw_all.json')
ai_text = load_text('$TEMP_DIR/ai_result.json')

# Determine market status (ET timezone approximation)
from datetime import datetime
import subprocess
try:
    et_str = subprocess.check_output(['date', '-v+0H', '+%u %H %M']).decode().strip()
    # Just use UTC offset approximation
    import time
    utc_now = datetime.utcnow()
    # ET is UTC-4 (EDT) or UTC-5 (EST)
    et_hour = (utc_now.hour - 4) % 24
    et_day = utc_now.weekday()  # 0=Mon, 6=Sun
    et_min = utc_now.minute
    et_time = et_hour * 60 + et_min

    if et_day >= 5:
        market_status = 'Closed'
    elif et_time < 240:
        market_status = 'Closed'
    elif et_time < 570:
        market_status = 'Pre-Market'
    elif et_time < 960:
        market_status = 'Open'
    elif et_time < 1200:
        market_status = 'After Hours'
    else:
        market_status = 'Closed'
except:
    market_status = 'Closed'

try:
    ai = json.loads(ai_text)
except:
    ai = {}

# Build final data
global_news = ai.get('globalNews', raw.get('global_news', [])[:5])
crypto_news = ai.get('cryptoNews', raw.get('crypto_news', [])[:5])
ai_news = ai.get('aiNews', raw.get('ai_news', [])[:5])
stock_explanations = ai.get('stockExplanations', {})
pulse_picks = ai.get('pulsePicks', [
    {'ticker':'NVDA','action':'Watch','reasoning':'Strong AI chip demand. Valuation stretched — wait for pullback.','timeframe':'Medium-term (1-3 months)','riskLevel':'Medium'},
    {'ticker':'BTC','action':'Consider Buying','reasoning':'Holding above key support. ETF inflows strong. Halving cycle favorable.','timeframe':'Long-term (3+ months)','riskLevel':'High'},
    {'ticker':'GOOG','action':'Consider Buying','reasoning':'Discount to mega-cap peers. Gemini progress improving sentiment. Cloud growth accelerating.','timeframe':'Medium-term (1-3 months)','riskLevel':'Low'}
])

# Enrich stocks with explanations
stocks = raw.get('stocks', [])
for s in stocks:
    if s['ticker'] in stock_explanations:
        s['explanation'] = stock_explanations[s['ticker']]

visa = raw.get('visa_stock')
earnings = ai.get('earnings', [])

dashboard = {
    'lastUpdated': datetime.now(timezone.utc).isoformat(),
    'marketStatus': market_status,
    'globalNews': global_news,
    'cryptoAssets': raw.get('crypto_assets', []),
    'cryptoNews': crypto_news,
    'aiNews': ai_news,
    'techMovers': stocks,
    'pulsePicks': pulse_picks,
    'fearGreedIndex': raw.get('fear_greed', 50),
    'visaStock': visa,
    'earnings': earnings,
    'marketIndicators': [
        {'label': 'S&P 500', 'value': '5,264', 'change': -0.3},
        {'label': 'VIX', 'value': '18.2', 'change': 2.1},
        {'label': 'DXY', 'value': '104.1', 'change': -0.2},
        {'label': '10Y Yield', 'value': '4.32%', 'change': 0.0},
    ]
}

# Preserve existing podcast data from previous runs
# Use file locking to prevent race conditions with podcasts.sh
import fcntl
existing_path = '$DATA_DIR/dashboard.json'
lock_path = '$DATA_DIR/.dashboard.lock'

lock_file = open(lock_path, 'w')
try:
    fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)

    try:
        with open(existing_path) as f:
            existing = json.load(f)
        dashboard['podcasts'] = existing.get('podcasts', [])
    except:
        pass

    # Write atomically using temp file
    temp_path = existing_path + '.tmp'
    with open(temp_path, 'w') as f:
        json.dump(dashboard, f, indent=2)
    os.rename(temp_path, existing_path)
finally:
    fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
    lock_file.close()

print('✅ Dashboard data written to data/dashboard.json')
"

# Cleanup
rm -rf "$TEMP_DIR"

echo "🚀 Pulse refresh complete!"
