#!/usr/bin/env python3
"""Parse podcast RSS feed from stdin, output JSON for latest episode."""
import sys
import json
import re
import html as html_mod

raw = sys.stdin.read()
podcast_name = sys.argv[1] if len(sys.argv) > 1 else "Unknown"

try:
    # First try proper XML parsing (works for well-formed feeds)
    import xml.etree.ElementTree as ET
    try:
        root = ET.fromstring(raw)
        ns = {'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd'}
        items = root.findall('.//item')
        if items:
            item = items[0]
            title = item.findtext('title', '')
            link = item.findtext('link', '')
            pub_date = item.findtext('pubDate', '')
            description = item.findtext('description', '')
            duration = (item.findtext('itunes:duration', '', ns)
                       or item.findtext('{http://www.itunes.com/dtds/podcast-1.0.dtd}duration', ''))

            enclosure = item.find('enclosure')
            audio_url = enclosure.get('url', '') if enclosure is not None else ''

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
            sys.exit()
    except ET.ParseError:
        pass  # Fall through to regex parsing

    # Fallback: regex-based parsing for malformed/truncated XML
    # Find the start and end of the first <item> block
    start = raw.find('<item')
    if start == -1:
        print('{}')
        sys.exit()

    end = raw.find('</item>', start)
    if end == -1:
        # Truncated feed — use everything after <item>
        item_xml = raw[start:]
    else:
        item_xml = raw[start:end]

    def extract(tag):
        # Try CDATA first
        m = re.search(r'<' + re.escape(tag) + r'[^>]*><!\[CDATA\[(.*?)\]\]></' + re.escape(tag) + r'>', item_xml, re.DOTALL)
        if m:
            return m.group(1).strip()
        m = re.search(r'<' + re.escape(tag) + r'[^>]*>(.*?)</' + re.escape(tag) + r'>', item_xml, re.DOTALL)
        return m.group(1).strip() if m else ''

    title = extract('title')
    link = extract('link')
    pub_date = extract('pubDate')
    description = extract('description')
    duration = extract('itunes:duration')

    # Get audio URL from enclosure
    enc_match = re.search(r'<enclosure[^>]+url=["\']([^"\']+)["\']', item_xml)
    if not enc_match:
        enc_match = re.search(r'<enclosure[^>]+url=([^\s>]+)', item_xml)
    audio_url = enc_match.group(1).strip('"\'') if enc_match else ''

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
