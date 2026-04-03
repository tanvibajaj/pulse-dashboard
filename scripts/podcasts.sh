#!/usr/bin/env bash
# Pulse Podcast Pipeline
# Scrapes latest crypto/AI podcast episodes, transcribes with Whisper, summarizes with Claude
# Run: ./scripts/podcasts.sh

set -e
export PATH="$HOME/Library/Python/3.9/bin:/opt/homebrew/bin:$PATH"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"
PODCAST_DIR="$DATA_DIR/podcasts"
mkdir -p "$PODCAST_DIR"

echo "🎙️  Podcast pipeline starting..."

# --- Podcast RSS feeds (name|url) ---
# Crypto (5)
PODCASTS=(
  "Bankless|https://feeds.flightcast.com/p83fuj0y0u58o82l41xei7zo.xml"
  "Unchained|https://feeds.megaphone.fm/LSHML4761942757"
  "Empire|https://feeds.megaphone.fm/empire"
  "Bell Curve|https://feeds.megaphone.fm/bellcurve"
  "The Defiant|https://anchor.fm/s/1bee9344/podcast/rss"
)
# AI (5)
PODCASTS+=(
  "a16z Podcast|https://feeds.simplecast.com/JGE3yC0V"
  "Latent Space|https://api.substack.com/feed/podcast/1084089.rss"
  "No Priors|https://rss.art19.com/no-priors-ai"
  "Cognitive Revolution|https://feeds.megaphone.fm/RINTP3108857801"
  "This Week in AI|https://anchor.fm/s/10803d078/podcast/rss"
)

TEMP_DIR=$(mktemp -d)
SUMMARIES="[]"

echo "📡 Checking for new episodes..."

for entry in "${PODCASTS[@]}"; do
  podcast_name="${entry%%|*}"
  feed_url="${entry#*|}"

  # Fetch latest episode from RSS (only first 200KB — we only need the first episode)
  FEED_HASH=$(echo "$podcast_name" | md5 -q 2>/dev/null || echo "$podcast_name" | md5sum | cut -d' ' -f1)
  FEED_FILE="$TEMP_DIR/feed_${FEED_HASH}.xml"
  curl -s -L --max-time 20 "$feed_url" 2>/dev/null | head -c 200000 > "$FEED_FILE"
  EPISODE_DATA=$(python3 "$SCRIPT_DIR/parse_podcast_rss.py" "$podcast_name" < "$FEED_FILE" 2>/dev/null)

  if [ -z "$EPISODE_DATA" ] || [ "$EPISODE_DATA" = "{}" ]; then
    echo "  ⏭️  $podcast_name: no episodes found"
    continue
  fi

  TITLE=$(echo "$EPISODE_DATA" | python3 -c "import json,sys; print(json.load(sys.stdin).get('title',''))" 2>/dev/null)
  AUDIO_URL=$(echo "$EPISODE_DATA" | python3 -c "import json,sys; print(json.load(sys.stdin).get('audioUrl',''))" 2>/dev/null)
  PUB_DATE=$(echo "$EPISODE_DATA" | python3 -c "import json,sys; print(json.load(sys.stdin).get('pubDate',''))" 2>/dev/null)

  # Check if this episode is from the last 7 days
  IS_RECENT=$(python3 -c "
from datetime import datetime, timedelta
import email.utils, sys
try:
    d = email.utils.parsedate_to_datetime('$PUB_DATE')
    print('yes' if (datetime.now(d.tzinfo) - d) < timedelta(days=7) else 'no')
except:
    print('no')
" 2>/dev/null)

  if [ "$IS_RECENT" != "yes" ]; then
    echo "  ⏭️  $podcast_name: latest episode is older than 7 days"
    continue
  fi

  # Check if we already have a summary for this episode
  EPISODE_HASH=$(echo "$TITLE" | md5 -q 2>/dev/null || echo "$TITLE" | md5sum 2>/dev/null | cut -d' ' -f1)
  if [ -f "$PODCAST_DIR/${EPISODE_HASH}.json" ]; then
    echo "  ✅ $podcast_name: \"$TITLE\" (already summarized)"
    continue
  fi

  echo "  🎧 $podcast_name: \"$TITLE\""

  TRANSCRIPT=""

  # Try to download and transcribe audio
  if [ -n "$AUDIO_URL" ] && command -v whisper &>/dev/null && command -v ffmpeg &>/dev/null; then
    echo "    📥 Downloading audio..."
    AUDIO_FILE="$TEMP_DIR/${EPISODE_HASH}.mp3"

    # Download first 30 minutes (enough for a good summary)
    curl -s -L --max-time 120 -o "$AUDIO_FILE" "$AUDIO_URL" 2>/dev/null

    if [ -f "$AUDIO_FILE" ] && [ -s "$AUDIO_FILE" ]; then
      # Trim to 30 min to speed up transcription
      TRIMMED="$TEMP_DIR/${EPISODE_HASH}_trimmed.mp3"
      ffmpeg -y -i "$AUDIO_FILE" -t 1800 -acodec copy "$TRIMMED" 2>/dev/null || TRIMMED="$AUDIO_FILE"

      echo "    🔊 Transcribing with Whisper (this may take a few minutes)..."
      whisper "$TRIMMED" --model base --language en --output_format txt --output_dir "$TEMP_DIR" 2>/dev/null

      TRANSCRIPT_FILE="$TEMP_DIR/${EPISODE_HASH}_trimmed.txt"
      [ ! -f "$TRANSCRIPT_FILE" ] && TRANSCRIPT_FILE="$TEMP_DIR/${EPISODE_HASH}.txt"

      if [ -f "$TRANSCRIPT_FILE" ]; then
        TRANSCRIPT=$(cat "$TRANSCRIPT_FILE" | head -c 15000)
        echo "    ✅ Transcription complete ($(wc -w < "$TRANSCRIPT_FILE" | tr -d ' ') words)"
      fi
    fi
  fi

  # Fall back to show notes if transcription not available
  DESCRIPTION=$(echo "$EPISODE_DATA" | python3 -c "import json,sys; print(json.load(sys.stdin).get('description',''))" 2>/dev/null)

  if [ -z "$TRANSCRIPT" ]; then
    echo "    📝 Using show notes for summary (no audio transcription available)"
    TRANSCRIPT="$DESCRIPTION"
  fi

  # Summarize with Claude using temp files to avoid quoting issues
  echo "    🤖 Generating summary..."

  PROMPT_FILE="$TEMP_DIR/prompt_${EPISODE_HASH}.txt"
  cat > "$PROMPT_FILE" << SUMMARYEOF
You are summarizing a podcast episode for a busy product lead at a fintech/crypto company.

Podcast: $podcast_name
Episode: $TITLE

Content to summarize:
SUMMARYEOF
  echo "$TRANSCRIPT" >> "$PROMPT_FILE"
  cat >> "$PROMPT_FILE" << 'SUMMARYEOF2'

Return ONLY valid JSON (no markdown):
{
  "summary": "A compelling 2-3 sentence summary of the episode's main thesis and key discussion points",
  "keyTakeaways": ["3-5 bullet points capturing the most actionable/interesting insights"]
}
SUMMARYEOF2

  RAW_SUMMARY=$(cat "$PROMPT_FILE" | python3 "$SCRIPT_DIR/ai_call.py" 2>/dev/null) || RAW_SUMMARY=""

  # Parse Claude CLI envelope and save episode JSON
  DURATION=$(echo "$EPISODE_DATA" | python3 -c "import json,sys; print(json.load(sys.stdin).get('duration',''))" 2>/dev/null)
  LINK=$(echo "$EPISODE_DATA" | python3 -c "import json,sys; print(json.load(sys.stdin).get('link',''))" 2>/dev/null)

  echo "$RAW_SUMMARY" | TITLE_VAL="$TITLE" PODCAST_VAL="$podcast_name" \
  PUB_DATE_VAL="$PUB_DATE" DURATION_VAL="$DURATION" LINK_VAL="$LINK" \
  OUTFILE="$PODCAST_DIR/${EPISODE_HASH}.json" python3 -c "
import json, os, sys, re
try:
    envelope = json.load(sys.stdin)
    text = envelope.get('result', '')
    text = re.sub(r'^\s*\`\`\`(?:json)?\s*', '', text)
    text = re.sub(r'\s*\`\`\`\s*$', '', text)
    summary_data = json.loads(text.strip())
except:
    summary_data = {'summary': 'Summary generation failed.', 'keyTakeaways': []}

episode = {
    'title': os.environ['TITLE_VAL'],
    'podcast': os.environ['PODCAST_VAL'],
    'date': os.environ['PUB_DATE_VAL'],
    'duration': os.environ['DURATION_VAL'],
    'summary': summary_data.get('summary', ''),
    'keyTakeaways': summary_data.get('keyTakeaways', []),
    'url': os.environ['LINK_VAL']
}
with open(os.environ['OUTFILE'], 'w') as f:
    json.dump(episode, f, indent=2)
print('OK')
"

  echo "    ✅ Saved summary"
done

# --- Assemble all podcast summaries ---
echo "📦 Assembling podcast summaries..."

python3 -c "
import json, glob, os
from datetime import datetime
import email.utils

summaries = []
for f in glob.glob('$PODCAST_DIR/*.json'):
    try:
        with open(f) as fp:
            data = json.load(fp)
            # Parse date for sorting
            try:
                d = email.utils.parsedate_to_datetime(data.get('date', ''))
                data['_sort'] = d.timestamp()
            except:
                data['_sort'] = 0
            summaries.append(data)
    except:
        pass

# Sort by date descending, keep latest 10
summaries.sort(key=lambda x: x.get('_sort', 0), reverse=True)
summaries = summaries[:10]

# Remove sort key
for s in summaries:
    s.pop('_sort', None)

# Update dashboard.json with podcasts
dashboard_path = '$DATA_DIR/dashboard.json'
try:
    with open(dashboard_path) as f:
        dashboard = json.load(f)
except:
    dashboard = {}

dashboard['podcasts'] = summaries

with open(dashboard_path, 'w') as f:
    json.dump(dashboard, f, indent=2)

print(f'✅ {len(summaries)} podcast summaries assembled')
"

# Cleanup
rm -rf "$TEMP_DIR"

echo "🚀 Podcast pipeline complete!"
