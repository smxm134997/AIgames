# -*- coding: utf-8 -*-
"""游戏库管理后端：Flask 提供 REST API 并托管前端静态资源。

启动： python app.py
访问： http://localhost:5000/
"""
import os
import sys

# 自动加载本地 vendor 依赖目录（避免污染系统环境）
_VENDOR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor")
if os.path.isdir(_VENDOR) and _VENDOR not in sys.path:
    sys.path.insert(0, _VENDOR)

from flask import Flask, send_from_directory, request, jsonify

import storage

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="")


# ---------- 前端页面 ----------
@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


# ---------- API ----------
@app.get("/api/games")
def api_list_games():
    q = request.args.get("q", "").strip() or None
    genre = request.args.get("genre", "").strip() or None
    status = request.args.get("status", "").strip() or None
    return jsonify(storage.list_games(q=q, genre=genre, status=status))


@app.get("/api/games/<game_id>")
def api_get_game(game_id):
    game = storage.get_game(game_id)
    if not game:
        return jsonify({"error": "游戏不存在"}), 404
    return jsonify(game)


@app.post("/api/games")
def api_add_game():
    payload = request.get_json(silent=True) or {}
    game, errs = storage.add_game(payload)
    if errs:
        return jsonify({"errors": errs}), 400
    return jsonify(game), 201


@app.put("/api/games/<game_id>")
def api_update_game(game_id):
    payload = request.get_json(silent=True) or {}
    game, errs = storage.update_game(game_id, payload)
    if errs:
        status = 404 if errs == ["游戏不存在"] else 400
        return jsonify({"errors": errs}), status
    return jsonify(game)


@app.delete("/api/games/<game_id>")
def api_delete_game(game_id):
    if storage.delete_game(game_id):
        return jsonify({"message": "已删除"})
    return jsonify({"error": "游戏不存在"}), 404


@app.get("/api/stats")
def api_stats():
    return jsonify(storage.stats())


@app.get("/api/meta")
def api_meta():
    """返回元信息：可选分类、平台、状态、可玩游戏类型。"""
    return jsonify({
        "genres": ["动作", "冒险", "RPG", "策略", "射击", "解谜", "模拟", "体育", "竞速", "其他"],
        "platforms": ["PC", "PS5", "PS4", "Xbox Series", "Switch", "手机", "其他"],
        "statuses": ["未玩", "在玩", "已通关"],
        "game_types": {
            "": "暂不可玩",
            "snake": "贪吃蛇",
            "g2048": "2048",
            "breakout": "打砖块",
            "memory": "记忆翻牌",
            "dodge": "躲避障碍",
            "catch": "接水果",
        },
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
