from __future__ import annotations

import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
RSS_PATH = DATA_DIR / "radio-t.xml"
JSON_PATH = DATA_DIR / "latest.json"
SOURCE_URL = "http://feeds.rucast.net/radio-t"
TARGET_EPISODE = 1500
TITLE_PATTERN = re.compile(r"(\d+)")


def fetch_rss(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "radio-t-1500-countdown/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def parse_latest_episode(xml_text: str) -> tuple[int, datetime]:
    root = ET.fromstring(xml_text)
    item = root.find("./channel/item")
    if item is None:
        raise RuntimeError("RSS does not contain any items")

    title = item.findtext("title", default="")
    match = TITLE_PATTERN.search(title)
    if match is None:
        raise RuntimeError(f"Could not parse episode number from title: {title!r}")

    pub_date = item.findtext("pubDate")
    if not pub_date:
        raise RuntimeError("RSS item does not contain pubDate")

    return int(match.group(1)), parsedate_to_datetime(pub_date).astimezone(timezone.utc)


def scheduled_time_from_pubdate(pub_date: datetime) -> datetime:
    return datetime(pub_date.year, pub_date.month, pub_date.day, 20, 0, tzinfo=timezone.utc)


def build_payload(episode: int, pub_date: datetime) -> dict[str, object]:
    scheduled_utc = scheduled_time_from_pubdate(pub_date)
    episodes_remaining = TARGET_EPISODE - episode
    target_utc = scheduled_utc + timedelta(weeks=max(episodes_remaining, 0))

    return {
        "episode": episode,
        "rss_pub_date": pub_date.isoformat(),
        "scheduled_utc": scheduled_utc.isoformat(),
        "target_episode": TARGET_EPISODE,
        "episodes_remaining": episodes_remaining,
        "target_utc": target_utc.isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source_url": SOURCE_URL,
    }


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    xml_text = fetch_rss(SOURCE_URL)
    episode, pub_date = parse_latest_episode(xml_text)
    payload = build_payload(episode, pub_date)

    RSS_PATH.write_text(xml_text, encoding="utf-8")
    JSON_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
