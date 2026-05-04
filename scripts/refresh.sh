#!/bin/bash
# Pulse Dashboard Refresh Script
# Fetches news, market data, economic calendar, and sector performance
# Run: ./scripts/refresh.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"
TEMP_DIR=$(mktemp -d)

echo "⚡ Pulse refresh starting..."

# --- 1. Fetch raw data in parallel ---

echo "📡 Fetching data..."

# RSS feed fetcher
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

# Stock data via yfinance (includes sector ETFs for heatmap)
python3 -c "
import json, sys

try:
    import yfinance as yf
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'yfinance', '-q', '--break-system-packages'])
    import yfinance as yf

# Individual stocks
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

# Sector ETFs for heatmap
SECTORS = {
    'XLK': 'Technology',
    'XLF': 'Financials',
    'XLV': 'Healthcare',
    'XLE': 'Energy',
    'XLY': 'Consumer Discretionary',
    'XLP': 'Consumer Staples',
    'XLI': 'Industrials',
    'XLB': 'Materials',
    'XLU': 'Utilities',
    'XLRE': 'Real Estate',
    'XLC': 'Communication Services',
}

all_tickers = list(TICKERS.keys()) + list(SECTORS.keys())

try:
    data = yf.download(all_tickers, period='5d', interval='1d', progress=False, auto_adjust=True)
    closes = data['Close'].tail(2)
except Exception as e:
    print(f'yfinance error: {e}', file=sys.stderr)
    closes = None

# Process individual stocks
for ticker, name in TICKERS.items():
    try:
        if closes is not None:
            prev = float(closes[ticker].iloc[0])
            curr = float(closes[ticker].iloc[1])
            chg = curr - prev
            pct = (chg / prev) * 100
            out = {'ticker': ticker, 'name': name, 'price': round(curr, 2), 'change': round(chg, 2), 'changePercent': round(pct, 2)}
        else:
            out = {'ticker': ticker, 'name': name, 'price': 0, 'change': 0, 'changePercent': 0}
    except:
        out = {'ticker': ticker, 'name': name, 'price': 0, 'change': 0, 'changePercent': 0}
    with open('$TEMP_DIR/stock_' + ticker + '.json', 'w') as f:
        json.dump(out, f)

# Process sector ETFs
sectors = []
for ticker, name in SECTORS.items():
    try:
        if closes is not None:
            prev = float(closes[ticker].iloc[0])
            curr = float(closes[ticker].iloc[1])
            pct = ((curr - prev) / prev) * 100
            sectors.append({'ticker': ticker, 'name': name, 'changePercent': round(pct, 2)})
        else:
            sectors.append({'ticker': ticker, 'name': name, 'changePercent': 0})
    except:
        sectors.append({'ticker': ticker, 'name': name, 'changePercent': 0})

# Sort sectors by performance
sectors.sort(key=lambda x: x['changePercent'], reverse=True)
with open('$TEMP_DIR/sectors.json', 'w') as f:
    json.dump(sectors, f)
" 2>&1 | head -20 || echo "⚠️ Stock fetch had warnings"

wait
echo "✅ Data fetched"

# --- 2. Fetch Economic Calendar ---

echo "📅 Fetching economic calendar..."

python3 -c "
import json
from datetime import datetime, timedelta

# Generate upcoming economic events (known schedule)
# These are recurring events with predictable dates
today = datetime.now()
events = []

# Helper to find next occurrence of weekday
def next_weekday(d, weekday):
    days_ahead = weekday - d.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    return d + timedelta(days_ahead)

# FOMC meetings 2026 (actual Fed schedule)
fomc_dates = ['2026-01-28', '2026-03-18', '2026-05-06', '2026-06-17', '2026-07-29', '2026-09-16', '2026-11-04', '2026-12-16']
for date_str in fomc_dates:
    date = datetime.strptime(date_str, '%Y-%m-%d')
    if today <= date <= today + timedelta(days=30):
        events.append({
            'date': date_str,
            'time': '14:00 ET',
            'event': 'FOMC Interest Rate Decision',
            'importance': 'high',
            'description': 'Federal Reserve interest rate announcement and policy statement'
        })

# Monthly recurring events (approximate - actual dates vary)
# CPI - usually 2nd week of month
cpi_date = today.replace(day=12)
if cpi_date < today:
    cpi_date = (today.replace(day=1) + timedelta(days=32)).replace(day=12)
if cpi_date <= today + timedelta(days=14):
    events.append({
        'date': cpi_date.strftime('%Y-%m-%d'),
        'time': '08:30 ET',
        'event': 'CPI Inflation Data',
        'importance': 'high',
        'description': 'Consumer Price Index - key inflation measure'
    })

# Jobs Report - first Friday of month
first_day_next = (today.replace(day=1) + timedelta(days=32)).replace(day=1)
jobs_date = next_weekday(first_day_next, 4)  # Friday = 4
if today <= jobs_date <= today + timedelta(days=14):
    events.append({
        'date': jobs_date.strftime('%Y-%m-%d'),
        'time': '08:30 ET',
        'event': 'Non-Farm Payrolls',
        'importance': 'high',
        'description': 'Monthly jobs report - employment and wage data'
    })

# GDP - last week of month (quarterly)
if today.month in [1, 4, 7, 10]:
    gdp_date = today.replace(day=25)
    if today <= gdp_date <= today + timedelta(days=14):
        events.append({
            'date': gdp_date.strftime('%Y-%m-%d'),
            'time': '08:30 ET',
            'event': 'GDP Growth Rate',
            'importance': 'high',
            'description': 'Quarterly economic growth data'
        })

# Retail Sales - mid month
retail_date = today.replace(day=15)
if retail_date < today:
    retail_date = (today.replace(day=1) + timedelta(days=32)).replace(day=15)
if today <= retail_date <= today + timedelta(days=14):
    events.append({
        'date': retail_date.strftime('%Y-%m-%d'),
        'time': '08:30 ET',
        'event': 'Retail Sales',
        'importance': 'medium',
        'description': 'Monthly consumer spending data'
    })

# Sort by date
events.sort(key=lambda x: x['date'])

with open('$TEMP_DIR/econ_calendar.json', 'w') as f:
    json.dump(events[:8], f)
"

echo "✅ Economic calendar generated"

# --- 3. Merge all data ---

echo "📦 Assembling dashboard..."

python3 -c "
import json, sys, os, glob
from datetime import datetime, timezone

def load(path):
    try:
        with open(path) as f:
            return json.load(f)
    except:
        return []

def load_dict(path):
    try:
        with open(path) as f:
            return json.load(f)
    except:
        return {}

# Load news
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

# Load stocks
stocks = []
for f in glob.glob('$TEMP_DIR/stock_*.json'):
    s = load_dict(f)
    if isinstance(s, dict) and s.get('price', 0) > 0:
        stocks.append(s)

visa_stock = next((s for s in stocks if s['ticker'] == 'V'), None)
tech_stocks = [s for s in stocks if s['ticker'] != 'V']
tech_stocks.sort(key=lambda x: abs(x.get('changePercent', 0)), reverse=True)
tech_stocks = tech_stocks[:5]

# Load sectors
sectors = load('$TEMP_DIR/sectors.json')

# Load economic calendar
econ_calendar = load('$TEMP_DIR/econ_calendar.json')

# Fear & Greed
fng_data = load_dict('$TEMP_DIR/fng.json')
try:
    fng_value = int(fng_data.get('data', [{}])[0].get('value', 0))
except:
    fng_value = 50

# Determine market status
utc_now = datetime.utcnow()
et_hour = (utc_now.hour - 4) % 24
et_day = utc_now.weekday()
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

# Build dashboard
dashboard = {
    'lastUpdated': datetime.now(timezone.utc).isoformat(),
    'marketStatus': market_status,
    'globalNews': global_news[:5],
    'cryptoAssets': crypto_assets,
    'cryptoNews': crypto_news[:5],
    'aiNews': ai_news[:5],
    'techMovers': tech_stocks,
    'fearGreedIndex': fng_value,
    'visaStock': visa_stock,
    'sectors': sectors,
    'economicCalendar': econ_calendar,
    'marketIndicators': [
        {'label': 'S&P 500', 'value': '5,264', 'change': -0.3},
        {'label': 'VIX', 'value': '18.2', 'change': 2.1},
        {'label': 'DXY', 'value': '104.1', 'change': -0.2},
        {'label': '10Y Yield', 'value': '4.32%', 'change': 0.0},
    ]
}

# Use file locking to prevent race conditions
import fcntl
existing_path = '$DATA_DIR/dashboard.json'
lock_path = '$DATA_DIR/.dashboard.lock'

lock_file = open(lock_path, 'w')
try:
    fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)

    # Write atomically
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
