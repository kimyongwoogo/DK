#!/usr/bin/env python3
"""Merge a verified daily observation into the dashboard's public data."""

import argparse
from datetime import date, datetime, timedelta, timezone
import json
from pathlib import Path
import re
from tempfile import TemporaryDirectory
import unicodedata
from urllib.parse import parse_qs, urlsplit


CHANNELS = ("tvcf", "youtube", "news")
STATUSES = {"complete", "partial", "limited"}
PROVIDERS = {"naver", "google", "publisher"}
PUBLIC_FIELDS = {
    "tvcf": ("idx", "onair", "registered"),
    "youtube": ("video_id", "views", "likes", "comments", "views_label", "likes_label", "comments_label"),
    "news": ("outlet", "published_on", "providers"),
}
COMMON_FIELDS = ("company", "brand", "product", "title", "url")
VIDEO_ID = re.compile(r"[a-zA-Z0-9_-]{11}")
AD_PATH = re.compile(r"/play/(?:[a-zA-Z0-9]+-)?(\d+)/?")
KST = timezone(timedelta(hours=9))
MAX_RUNS = 90


def checked_date(value):
    day = date.fromisoformat(value)
    if day.isoformat() != value:
        raise ValueError(f"Use YYYY-MM-DD for dates: {value}")
    return day


def require_text(row, field, limit=400):
    value = row.get(field)
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ValueError(f"Invalid {field}")
    return value


def article_key(row):
    def fold(value):
        return "".join(ch for ch in unicodedata.normalize("NFKC", value).lower() if ch.isalnum())
    return tuple(fold(row.get(field, "")) for field in
                 ("company", "brand", "product", "outlet", "published_on", "title"))


def validate_record(row, channel, companies, day):
    if not isinstance(row, dict):
        raise ValueError(f"Invalid {channel} record")
    company = require_text(row, "company")
    if company not in companies:
        raise ValueError(f"Company outside dashboard scope: {company}")
    require_text(row, "brand")
    require_text(row, "title")
    product = row.get("product", "")
    if not isinstance(product, str) or len(product) > 400:
        raise ValueError("Invalid product")
    url = urlsplit(require_text(row, "url", 3000))
    if url.scheme != "https" or not url.hostname or url.username or url.password:
        raise ValueError("Use a verified public HTTPS link")

    if channel == "tvcf":
        match = AD_PATH.fullmatch(url.path)
        if not match or match[1] != row.get("idx") or not (
            url.hostname == "tvcf.co.kr" or url.hostname.endswith(".tvcf.co.kr")
        ):
            raise ValueError("TVCF URL and idx must match")
        for field in ("onair", "registered"):
            if row.get(field) is not None and checked_date(row[field]) > day:
                raise ValueError(f"{field} is after the check date")
        return row["idx"]

    if channel == "youtube":
        video_id = require_text(row, "video_id")
        if url.hostname == "youtu.be":
            url_id = url.path.strip("/")
        elif url.hostname in {"youtube.com", "www.youtube.com", "m.youtube.com"}:
            url_id = url.path.split("/")[-1] if url.path.startswith("/shorts/") else (
                parse_qs(url.query).get("v", [""])[0] if url.path == "/watch" else ""
            )
        else:
            url_id = ""
        if not VIDEO_ID.fullmatch(video_id) or url_id != video_id:
            raise ValueError("YouTube URL and video_id must match")
        for field in ("views", "likes", "comments"):
            count = row.get(field)
            if count is not None and (type(count) is not int or not 0 <= count <= 2**53 - 1):
                raise ValueError(f"Use an exact integer or null for {field}")
            if row.get(field + "_label") is not None:
                require_text(row, field + "_label", 48)
        return video_id

    require_text(row, "outlet")
    if checked_date(require_text(row, "published_on")) > day:
        raise ValueError("News publication date is after the check date")
    providers = row.get("providers")
    if not isinstance(providers, list) or not providers or not all(item in PROVIDERS for item in providers):
        raise ValueError("Use verified naver, google or publisher providers")
    return article_key(row)


def normalize_run(run, companies):
    if not isinstance(run, dict):
        raise ValueError("Expected one daily observation object")
    checked_at = datetime.fromisoformat(require_text(run, "checked_at"))
    if checked_at.utcoffset() != timedelta(hours=9):
        raise ValueError("checked_at must include the +09:00 offset")
    result = {"checked_at": checked_at.astimezone(KST).isoformat(timespec="seconds")}
    for channel in CHANNELS:
        section = run.get(channel)
        if not isinstance(section, dict) or section.get("status") not in STATUSES:
            raise ValueError(f"Missing or invalid {channel} status")
        scope = require_text(section, "scope", 700)
        rows = section.get("records")
        if not isinstance(rows, list) or (section["status"] == "limited" and rows):
            raise ValueError(f"Invalid {channel} records")
        unique = {}
        for row in rows:
            key = validate_record(row, channel, companies, checked_at.date())
            if key not in unique:
                unique[key] = {field: row[field] for field in COMMON_FIELDS + PUBLIC_FIELDS[channel] if field in row}
            elif channel == "news":
                unique[key]["providers"] = list(dict.fromkeys(unique[key]["providers"] + row["providers"]))
            else:
                raise ValueError(f"Duplicate {channel} ID: {key}")
        result[channel] = {"status": section["status"], "scope": scope, "records": list(unique.values())}
    return result


def refresh(data_dir, update, output):
    history = json.loads((data_dir / "daily_checks.json").read_text(encoding="utf-8"))
    companies = {row["company"] for row in json.loads((data_dir / "companies.json").read_text(encoding="utf-8"))}
    observation = normalize_run(json.loads(update.read_text(encoding="utf-8")), companies)
    existing = {row["checked_at"]: row for row in history["runs"]}
    timestamp = observation["checked_at"]
    if timestamp in existing and existing[timestamp] != observation:
        raise ValueError("A different observation already uses this timestamp")
    existing[timestamp] = observation
    ordered = sorted(existing.values(), key=lambda row: row["checked_at"], reverse=True)
    updated = {"runs": ordered[:MAX_RUNS]}
    output.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=output.parent) as staging:
        pending = Path(staging) / output.name
        pending.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        pending.replace(output)
    return {"checked_at": timestamp, "changed": history != updated, "output": str(output)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=Path(__file__).resolve().parent / "data")
    parser.add_argument("--update", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(refresh(args.data_dir, args.update, args.output), ensure_ascii=False))


if __name__ == "__main__":
    main()
