#!/usr/bin/env python3
"""Read exact metrics exposed by the linked public YouTube watch pages."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import json
from pathlib import Path
import re
from threading import Event
from time import monotonic
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from refresh_metrics import KST, targets


def find_values(value, name):
    if isinstance(value, dict):
        if name in value:
            yield value[name]
        for child in value.values():
            yield from find_values(child, name)
    elif isinstance(value, list):
        for child in value:
            yield from find_values(child, name)


def embedded_json(page, name):
    assignment = re.search(rf"\b{name}\s*=\s*(?=\{{)", page)
    return json.JSONDecoder().raw_decode(page, assignment.end())[0] if assignment else {}


def display_text(value):
    if not isinstance(value, dict):
        return ""
    return value.get("simpleText") or "".join(part.get("text", "") for part in value.get("runs", []))


def exact_count(value):
    raw = str(value).strip()
    if re.fullmatch(r"(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)", raw):
        return int(raw.replace(",", ""))
    return None


def comment_count(data):
    for header in find_values(data, "engagementPanelTitleHeaderRenderer"):
        if isinstance(header, dict) and display_text(header.get("title")).strip() == "Comments":
            count = exact_count(display_text(header.get("contextualInfo")))
            if count is not None:
                return count
    for header in find_values(data, "commentsEntryPointHeaderRenderer"):
        if isinstance(header, dict):
            count = exact_count(display_text(header.get("commentCount")))
            if count is not None:
                return count
    return None


def read_metrics(source, rate_limited):
    if rate_limited.is_set():
        return None
    try:
        request = Request(source["url"] + "&hl=en&gl=KR", headers={
            "User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9",
        })
        with urlopen(request, timeout=16) as response:
            page = response.read(5_000_000).decode("utf-8", "replace")
        player = embedded_json(page, "ytInitialPlayerResponse")
        video = player.get("videoDetails", {})
        views = exact_count(video.get("viewCount"))
        if video.get("videoId") != source["video_id"] or views is None:
            return None
        data = embedded_json(page, "ytInitialData")
        button = next((value for value in find_values(data, "buttonViewModel")
                       if isinstance(value, dict) and value.get("iconName") == "LIKE"), {})
        label = re.search(r"along with ([0-9,]+) other people", button.get("accessibilityText", ""))
        likes = exact_count(label[1] if label else button.get("title"))
        comments_off = any("Comments are turned off." in display_text(value.get("text"))
                           for value in find_values(data, "messageRenderer") if isinstance(value, dict))
        return {
            "video_id": source["video_id"], "url": source["url"], "views": views,
            "likes": likes, "comments": None if comments_off else comment_count(data),
            "comments_off": comments_off,
        }
    except HTTPError as error:
        if error.code == 429:
            rate_limited.set()
        return None
    except (OSError, ValueError):
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=Path(__file__).resolve().parent / "data")
    parser.add_argument("--max-seconds", type=int, default=120)
    args = parser.parse_args()
    if args.max_seconds < 1:
        parser.error("--max-seconds must be positive")
    sources = targets(args.data_dir)["youtube"]
    rate_limited = Event()
    deadline = monotonic() + args.max_seconds

    def collect(source):
        return read_metrics(source, rate_limited) if monotonic() < deadline else None

    with ThreadPoolExecutor(max_workers=5) as pool:
        records = [row for row in pool.map(collect, sources) if row]
    print(json.dumps({"youtube": {
        "checked_at": datetime.now(KST).isoformat(timespec="seconds"), "records": records,
    }}, ensure_ascii=False))


if __name__ == "__main__":
    main()
