# -*- coding: utf-8 -*-
"""JSON 文件存储模块：负责游戏数据的持久化读写。"""
import json
import os
import uuid
from datetime import datetime
from threading import Lock

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "games.json")
_lock = Lock()

# 游戏允许的字段
FIELDS = {
    "title", "genre", "platform", "release_year", "developer",
    "rating", "cover_url", "description", "play_status", "game_type",
}
VALID_STATUS = {"未玩", "在玩", "已通关"}
VALID_GAME_TYPES = {"snake", "g2048", "breakout", "memory", "dodge", "catch"}


def _now():
    return datetime.now().isoformat(timespec="seconds")


def _load():
    """读取全部游戏数据。文件不存在时返回空列表。"""
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def _save(data):
    """写入全部游戏数据。"""
    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, DATA_FILE)


def _find(data, game_id):
    for g in data:
        if g.get("id") == game_id:
            return g
    return None


def list_games(q=None, genre=None, status=None):
    """返回游戏列表，支持关键词、分类、状态筛选。"""
    data = _load()
    result = data
    if q:
        ql = q.lower()
        result = [g for g in result if ql in g.get("title", "").lower()
                  or ql in g.get("developer", "").lower()
                  or ql in g.get("description", "").lower()]
    if genre:
        result = [g for g in result if g.get("genre") == genre]
    if status:
        result = [g for g in result if g.get("play_status") == status]
    # 按创建时间倒序
    result.sort(key=lambda g: g.get("created_at", ""), reverse=True)
    return result


def get_game(game_id):
    return _find(_load(), game_id)


def add_game(payload):
    """新增游戏，返回新建对象或错误信息。"""
    errs = validate(payload, partial=False)
    if errs:
        return None, errs
    data = _load()
    with _lock:
        game = {
            "id": uuid.uuid4().hex[:12],
            "title": payload["title"].strip(),
            "genre": payload["genre"].strip(),
            "platform": payload.get("platform", "").strip(),
            "release_year": int(payload["release_year"]),
            "developer": payload.get("developer", "").strip(),
            "rating": round(float(payload["rating"]), 1),
            "cover_url": payload.get("cover_url", "").strip(),
            "description": payload.get("description", "").strip(),
            "play_status": payload.get("play_status", "未玩"),
            "game_type": payload.get("game_type", ""),
            "created_at": _now(),
            "updated_at": _now(),
        }
        data.append(game)
        _save(data)
    return game, None


def update_game(game_id, payload):
    data = _load()
    with _lock:
        game = _find(data, game_id)
        if not game:
            return None, ["游戏不存在"]
        errs = validate(payload, partial=True)
        if errs:
            return None, errs
        for k in FIELDS:
            if k in payload:
                if k == "release_year":
                    game[k] = int(payload[k])
                elif k == "rating":
                    game[k] = round(float(payload[k]), 1)
                else:
                    game[k] = payload[k].strip() if isinstance(payload[k], str) else payload[k]
        game["updated_at"] = _now()
        _save(data)
        return game, None


def delete_game(game_id):
    data = _load()
    with _lock:
        for i, g in enumerate(data):
            if g.get("id") == game_id:
                del data[i]
                _save(data)
                return True
    return False


def stats():
    """返回统计信息：总数、各分类数、各状态数、平均分。"""
    data = _load()
    by_genre = {}
    by_status = {s: 0 for s in VALID_STATUS}
    total_rating = 0.0
    rated = 0
    for g in data:
        by_genre[g.get("genre", "未分类")] = by_genre.get(g.get("genre", "未分类"), 0) + 1
        st = g.get("play_status")
        if st in by_status:
            by_status[st] += 1
        r = g.get("rating", 0)
        if r:
            total_rating += r
            rated += 1
    return {
        "total": len(data),
        "by_genre": by_genre,
        "by_status": by_status,
        "avg_rating": round(total_rating / rated, 1) if rated else 0,
    }


def validate(payload, partial=False):
    """校验输入数据。partial=True 时仅校验提供的字段。"""
    errs = []
    required = [] if partial else ["title", "genre", "release_year", "rating"]
    for k in required:
        if k not in payload or payload[k] in (None, ""):
            errs.append(f"{k} 为必填项")
    if "release_year" in payload and payload["release_year"] not in (None, ""):
        try:
            y = int(payload["release_year"])
            if y < 1950 or y > 2100:
                errs.append("发行年份范围无效")
        except (ValueError, TypeError):
            errs.append("发行年份必须为数字")
    if "rating" in payload and payload["rating"] not in (None, ""):
        try:
            r = float(payload["rating"])
            if r < 0 or r > 10:
                errs.append("评分范围 0-10")
        except (ValueError, TypeError):
            errs.append("评分必须为数字")
    if "play_status" in payload and payload["play_status"] not in (None, "", *VALID_STATUS):
        errs.append(f"游玩状态须为: {', '.join(VALID_STATUS)}")
    if "game_type" in payload and payload["game_type"] not in (None, "", *VALID_GAME_TYPES):
        errs.append(f"游戏类型须为: {', '.join(sorted(VALID_GAME_TYPES))}")
    return errs
