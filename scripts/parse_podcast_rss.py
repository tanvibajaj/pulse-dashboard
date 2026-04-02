#!/usr/bin/env python3
"""Parse podcast RSS feed from stdin, output JSON for latest episode."""
import sys
import json
import re
import html as html_mod

raw = sys.stdin.read()
podcast_name = sys.argv[1] if len(sys.argv) > 1 else "Unknown"

try:
    # Use regex to extract the first <item> block (works with truncated/malformed XML)
    item_match = re.search(r'<item[^>]*>(.*?)</item>', raw, re.DOTALL)
    if not item_match:
        print('{}')
        sys.exit()

    item_xml = item_match.group(1)

    def extract(tag):
        # Try CDATA first
        m = re.search(r'<' + tag + r'[^>]*><!\[CDATA\[(.*?)\]\]></' + tag + r'>', item_xml, re.DOTALL)
        if m:
            return m.group(1).strip()
        m = re.search(r'<' + tag + r'[^>]*>(.*?)</' + tag + r'>', item_xml, re.DOTALL)
        return m.group(1).strip() if m else ''

    title = extract('title')
    link = extract('link')
    pub_date = extract('pubDate')
    description = extract('description')
    duration = extract('itunes:duration')

    # Get audio URL from enclosure
    enc_match = re.search(r'<enclosure[^>]+url=["\']([^"\']+)["\']', item_xml)
    audio_url = enc_match.group(1) if enc_match else ''

    # Clean description HTML
    description = html_mod.unescape(description)
    description = re.sub('<[^>]+>', '', description)[:1000]

    print(json.dumps({
        'title': title,
        'link': link,
        'pubDate': pub_date,
        'description': description,
        'duration': duration,
        'audioUrl': audio_url,
        'podcast': podcast_name,
    }))
except Exception:
    print('{}')
