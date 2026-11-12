#!/usr/bin/env python3
"""Merge observed public YouTube and TVCF metrics for the dashboard cards."""

import argparse
from datetime import date, datetime, timedelta, timezone
import json
from pathlib import Path
import re
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit


KST = timezone(timedelta(hours=9))
PLATFORMS = {"youtube": "video_id", "tvcf": "idx"}
METRICS = ("views", "likes", "comments")
VIDEO_ID = re.compile(r"[A-Za-z0-9_-]{11}")
TVCF_PATH = re.compile(r"/play/(?:[A-Za-z0-9]+-)?(\d+)")


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def targets(data_dir):
    ads = read_json(data_dir / "ads.json")
    competition = read_json(data_dir / "competition.json")
    youtube = read_json(data_dir / "youtube.json")
    tvcf_rows = read_json(data_dir / "tvcf_reactions.json")["rows"]
    priority_ids = {
        str(ad["idx"]) for ad in ads if ad["brand"] == "카리토포텐"
    } | {str(ad["idx"]) for ad in competition["ads"]}
    if ads:
        newest = max(date.fromisoformat(ad["onair"]) for ad in ads)
        cutoff = (newest - timedelta(days=29)).isoformat()
        priority_ids.update(str(ad["idx"]) for ad in ads if ad["onair"] >= cutoff)

    videos = {}
    linked = [(v, str(v["tvcf_idx"])) for v in youtube if v.get("tvcf_idx")]
    linked += [(v, str(v["idx"])) for v in competition["youtube"]]
    for row, idx in linked:
        video_id = row["video_id"]
        if isinstance(video_id, str) and VIDEO_ID.fullmatch(video_id):
            videos[video_id] = {
                "video_id": video_id,
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "priority": idx in priority_ids or videos.get(video_id, {}).get("priority", False),
            }

    tvcf = {}
    source_rows = [{"idx": ad["idx"], "url": ad.get("link", "")} for ad in ads + competition["ads"]]
    for row in source_rows + tvcf_rows:
        url = urlsplit(row["url"])
        match = TVCF_PATH.fullmatch(url.path)
        idx = str(row["idx"])
        if url.scheme == "https" and url.netloc == "tvcf.co.kr" and not (url.query or url.fragment) and match and match[1] == idx:
            tvcf[idx] = {"idx": idx, "url": row["url"], "priority": idx in priority_ids}
    return {
        "youtube": sorted(videos.values(), key=lambda row: not row["priority"]),
        "tvcf": sorted(tvcf.values(), key=lambda row: not row["priority"]),
    }


def timestamp(value):
    observed = datetime.fromisoformat(value)
    if observed.utcoffset() != timedelta(hours=9):
        raise ValueError("Use an ISO timestamp with +09:00")
    if observed > datetime.now(KST) + timedelta(minutes=2):
        raise ValueError("The observation is dated in the future")
    return observed.isoformat(timespec="seconds")


def normalize_records(rows, sources, platform, checked_at):
    identity = PLATFORMS[platform]
    allowed = {row[identity]: row["url"] for row in sources}
    valid = {}
    for row in rows:
        key = row[identity]
        if key in valid or key not in allowed or row.get("url") != allowed[key]:
            raise ValueError(f"Duplicate, unknown or mismatched {platform} source: {key}")
        values = {name: row.get(name) for name in METRICS}
        for value in values.values():
            if value is not None and (type(value) is not int or not 0 <= value <= 2**53 - 1):
                raise ValueError(f"Use exact nonnegative integers for {platform} metrics")
        if values["views"] is None or (platform == "tvcf" and None in values.values()):
            raise ValueError(f"Incomplete metrics for {platform} source: {key}")
        record = {"checked_at": checked_at, "views": values["views"]}
        if platform == "tvcf":
            record.update(values)
        else:
            for flag, metric in (("comments_off", "comments"), ("likes_hidden", "likes")):
                active = row.get(flag, False)
                if type(active) is not bool or (active and values[metric] is not None):
                    raise ValueError(f"Invalid {platform} flag for {key}: {flag}")
                if values[metric] is not None or active:
                    record.update({metric: values[metric], flag: active, f"{metric}_checked_at": checked_at})
        valid[key] = record
    return valid


def merge(data_dir, observation):
    path = data_dir / "metric_updates.json"
    prior = read_json(path)
    sources = targets(data_dir)
    updated = dict(prior)
    for platform in PLATFORMS:
        if platform not in observation:
            continue
        section = observation[platform]
        checked_at = timestamp(section["checked_at"])
        records = normalize_records(section["records"], sources[platform], platform, checked_at)
        previous = prior[platform]
        if previous.get("checked_at") and checked_at < previous["checked_at"]:
            raise ValueError(f"A newer {platform} observation is already published")
        merged = dict(previous["records"])
        for key, record in records.items():
            merged[key] = {**merged.get(key, {}), **record}
        updated[platform] = {
            "checked_at": checked_at,
            "updated_at": checked_at if records else previous.get("updated_at"),
            "confirmed": len(records),
            "total": len(sources[platform]),
            "records": merged,
        }
    if updated != prior:
        with TemporaryDirectory(dir=data_dir) as directory:
            staged = Path(directory) / path.name
            staged.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            staged.replace(path)
    return {platform: {k: v for k, v in section.items() if k != "records"} for platform, section in updated.items()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=Path(__file__).resolve().parent / "data")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--targets", action="store_true")
    mode.add_argument("--update", type=Path)
    args = parser.parse_args()
    result = targets(args.data_dir) if args.targets else merge(args.data_dir, read_json(args.update))
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
