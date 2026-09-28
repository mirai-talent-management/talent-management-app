#!/usr/bin/env python3
"""Build a short narrated presentation from screenshots of the local demo.

Requires macOS `say`, ImageMagick `magick`, and FFmpeg. No network or API keys.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "demo-video-assets"
OUTPUT = ROOT / "docs" / "action-board-talent-5-features.mp4"
FONT = Path("/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc")

SLIDES = [
    {
        "chapter": "INTRO",
        "title": "Action Board × Talent",
        "body": "主な5つの機能を、実際のデモ画面で紹介します。",
        "note": "非公式の統合提案 ・ 架空データ",
        "voice": "アクションボードとマイタレント。主な5つの機能を、実際のデモ画面で紹介します。",
    },
    {
        "chapter": "01 / 活動からスキルへ",
        "title": "活動が、経験になる",
        "body": "ミッション達成を記録すると、\n活動からスキル候補が見つかります。",
        "note": "架空のミッション達成画面",
        "voice": "ミッションの達成を記録すると、活動の経験からスキル候補が見つかります。",
        "image": "01-mission-achieved.jpg",
    },
    {
        "chapter": "01 / 活動からスキルへ",
        "title": "公開は、本人が決める",
        "body": "見つかったスキルは自動公開されず、\n本人が確認して承認します。",
        "note": "承認済みスキルの画面",
        "voice": "見つかったスキルは自動で公開されず、本人が内容を確認して承認します。",
        "image": "01-approved-skill.jpg",
    },
    {
        "chapter": "02 / マイタレント",
        "title": "自分の得意を登録",
        "body": "経験や得意、活動できる条件を\n自分の言葉で登録できます。",
        "note": "サポーター本人のプロフィール画面",
        "voice": "マイタレントでは、経験や得意、活動できる条件を自分の言葉で登録できます。",
        "image": "02-mytalent.jpg",
    },
    {
        "chapter": "02 / マイタレント",
        "title": "会話から強みを発見",
        "body": "インタビューで経験をふりかえり、\nスキル候補を整理します。",
        "note": "現在は外部AIを使わない Mock AI",
        "voice": "インタビューで経験をふりかえり、スキル候補を整理できます。現在は外部エーアイを使わないデモです。",
        "image": "02-interview.jpg",
    },
    {
        "chapter": "03 / 仲間探し",
        "title": "自然な言葉で検索",
        "body": "活動内容を文章で入力し、\n候補とその理由を確認できます。",
        "note": "現在はローカルの辞書・規則による検索",
        "voice": "活動内容を自然な文章で入力し、候補とその理由を確認できます。現在はローカルの辞書と規則による検索です。",
        "image": "03-search-query.jpg",
    },
    {
        "chapter": "04 / チーム編成",
        "title": "必要な役割を入力",
        "body": "活動の日時・場所・役割・人数から\nチーム案を考えます。",
        "note": "自動確定・自動連絡は行いません",
        "voice": "活動の日時、場所、必要な役割と人数を入力して、候補のチーム案を作れます。",
        "image": "04-team-input.jpg",
    },
    {
        "chapter": "04 / チーム編成",
        "title": "最後は、人が判断",
        "body": "役割ごとの候補と理由を見て、\n参加可否は本人に確認します。",
        "note": "現在はローカルの規則による編成案",
        "voice": "役割ごとの候補と理由を確認できます。当日の参加可否は、必ず本人に確認します。",
        "image": "04-team-proposal-focus.jpg",
    },
    {
        "chapter": "05 / 連絡文作成",
        "title": "声をかける文面を作る",
        "body": "メールや Slack 向けの文面を作成。\n活動の相談を始められます。",
        "note": "デモ送信は実際には届きません",
        "voice": "メールやスラック向けの連絡文を作れます。デモ送信は実際には届きません。",
        "image": "05-contact-email.jpg",
    },
    {
        "chapter": "OUTRO",
        "title": "アイデア共有用のデモ",
        "body": "実際の活用・設計・改変は、\n引き継ぐチームの判断で自由に。",
        "note": "非公式 ・ 架空データ ・ 本番環境未接続",
        "voice": "この動画はアイデア共有用です。実際の活用や改変は、引き継ぐチームで自由に判断してください。",
    },
]


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def text_file(directory: Path, name: str, value: str) -> Path:
    path = directory / name
    path.write_text(value, encoding="utf-8")
    return path


def duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "json", str(path),
        ],
        capture_output=True, text=True, check=True,
    )
    return float(json.loads(result.stdout)["format"]["duration"])


def annotate(path: Path, text: Path, x: int, y: int, size: int, color: str) -> None:
    run(
        "magick", str(path), "-font", str(FONT), "-pointsize", str(size),
        "-fill", color, "-gravity", "NorthWest", "-interline-spacing", "16",
        "-annotate", f"+{x}+{y}", "@" + str(text), str(path),
    )


def make_slide(slide: dict[str, str], index: int, directory: Path) -> Path:
    image = directory / f"slide-{index:02d}.png"
    run("magick", "-size", "1920x1080", "xc:#F7F8F3", str(image))

    if slide.get("image"):
        screenshot = ASSETS / slide["image"]
        if not screenshot.is_file():
            raise FileNotFoundError(screenshot)
        card = directory / f"screen-{index:02d}.png"
        run(
            "magick", str(screenshot), "-resize", "900x770^", "-gravity", "center",
            "-extent", "900x770", "-bordercolor", "#FFFFFF", "-border", "10",
            str(card),
        )
        run("magick", str(image), str(card), "-geometry", "+50+160", "-compose", "over", "-composite", str(image))
        run("magick", str(image), "-fill", "#DDE8E0", "-draw", "roundrectangle 1020,160 1870,940 24,24", str(image))
        run("magick", str(image), "-fill", "#FFFFFF", "-draw", "roundrectangle 1030,170 1860,930 18,18", str(image))
        x, chapter_y, title_y, body_y, note_y = 1080, 240, 355, 540, 827
        title_size, body_size = 56, 36
    else:
        run("magick", str(image), "-fill", "#DDEFE4", "-draw", "roundrectangle 90,120 1830,960 34,34", str(image))
        x, chapter_y, title_y, body_y, note_y = 180, 245, 355, 555, 822
        title_size, body_size = 82, 48

    chapter = text_file(directory, f"chapter-{index:02d}.txt", slide["chapter"])
    title = text_file(directory, f"title-{index:02d}.txt", slide["title"])
    body = text_file(directory, f"body-{index:02d}.txt", slide["body"])
    note = text_file(directory, f"note-{index:02d}.txt", slide["note"])
    annotate(image, chapter, x, chapter_y, 27, "#537668")
    annotate(image, title, x, title_y, title_size, "#182F27")
    annotate(image, body, x, body_y, body_size, "#334A40")
    annotate(image, note, x, note_y, 28, "#557264")

    footer = text_file(directory, f"footer-{index:02d}.txt", "Action Board × Talent  |  非公式ローカル統合デモ  |  すべて架空データ")
    annotate(image, footer, 70, 1015, 22, "#617468")
    return image


def main() -> None:
    for command in ("magick", "ffmpeg", "ffprobe", "say"):
        if not shutil.which(command):
            raise RuntimeError(f"Missing command: {command}")
    if not FONT.is_file():
        raise RuntimeError(f"Japanese font unavailable: {FONT}")

    with tempfile.TemporaryDirectory(prefix="talent-demo-video-") as temp:
        directory = Path(temp)
        clips = []
        for index, slide in enumerate(SLIDES):
            still = make_slide(slide, index, directory)
            sound = directory / f"voice-{index:02d}.aiff"
            run("say", "-v", "Kyoko", "-r", "195", "-o", str(sound), slide["voice"])
            length = max(4.0, duration(sound) + 1.1)
            clip = directory / f"clip-{index:02d}.mp4"
            run(
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-framerate", "30",
                "-i", str(still), "-i", str(sound), "-filter_complex",
                f"[0:v]fade=t=in:st=0:d=0.25,fade=t=out:st={length - 0.35:.3f}:d=0.35[v];"
                f"[1:a]apad,afade=t=out:st={length - 0.5:.3f}:d=0.5[a]",
                "-map", "[v]", "-map", "[a]", "-t", f"{length:.3f}",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-movflags", "+faststart", str(clip),
            )
            clips.append(clip)
        playlist = directory / "playlist.txt"
        playlist.write_text("".join(f"file '{clip}'\n" for clip in clips), encoding="utf-8")
        run(
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
            "-i", str(playlist), "-c", "copy", "-movflags", "+faststart", str(OUTPUT),
        )
    print(f"Created {OUTPUT} ({duration(OUTPUT):.1f} seconds)")


if __name__ == "__main__":
    main()
