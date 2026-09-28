#!/usr/bin/env python3
"""Build a narrated demo video with role/chapter cards and six real browser recordings.

Requires macOS say, ImageMagick, and FFmpeg. No network access or API keys.
"""
from __future__ import annotations
import json
import math
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLIPS = ROOT / 'docs/demo-video-clips'
OUTPUT = ROOT / 'docs/action-board-talent-5-features.mp4'
FONT = Path('/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc')
SLIDES = [
    {'chapter':'はじめに', 'title':'アクションボード×マイタレント',
     'body':'6つの機能を、操作画面で紹介します。',
     'note':'非公式の提案 ・ 架空データ',
     'voice':'アクションボードとマイタレント。6つの主な機能を、実際の操作画面で紹介します。'},
    {'chapter':'01 / 活動の記録', 'title':'活動が経験に',
     'body':'活動記録 →\nスキル候補 →\n本人が承認',
     'note':'',
     'voice_segments':[(0.8,'サンプルのミッションを開き、今回担当した役割を選びます。'),
                       (8.6,'達成を記録すると、担当経験がスキル候補として見つかります。'),
                       (17.0,'公開する内容は、本人が確認して承認します。')],
     'clip':'01-mission.mp4'},
    {'chapter':'02 / マイタレント', 'title':'自分の得意',
     'body':'会話 →\nスキル候補 →\n本人が承認',
     'note':'ローカルの模擬AI',
     'voice_segments':[(0.8,'マイタレントで、自分の得意と経験を確認します。'),
                       (5.5,'エーアイインタビューで、経験を一つ入力します。'),
                       (15.5,'このデモでは、回答からスキル候補が見つかると、その場で確認できます。'),
                       (23.0,'候補の根拠と表現を本人が確かめて承認すると、プロフィールに反映されます。')],
     'clip':'02-mytalent.mp4'},
    {'chapter':'03 / 仲間の推薦', 'title':'強みを届ける', 'card_title':'仲間の強みを推薦',
     'body':'仲間を探す →\n推薦 → 本人が確認',
     'note':'',
     'voice_segments':[(0.8,'サポーターは、一緒に活動した仲間の強みを推薦できます。'),
                       (8.3,'都道府県と名前で相手を探し、活動中に見つけた強みを具体的に書きます。'),
                       (22.0,'推薦を届けると、本人だけが確認できるスキル候補になります。'),
                       (28.5,'受け取った本人が候補を確認し、承認した場合だけプロフィールに反映されます。')],
     'clip':'03-recommend.mp4'},
    {'chapter':'04 / 仲間探し', 'title':'仲間を探す',
     'body':'活動を入力 →\n候補と理由 →\nプロフィール確認',
     'note':'ローカルの模擬検索',
     'voice_segments':[(1.8,'活動の内容を文章で入力して、仲間を探します。'),
                       (11.3,'読み取った条件と、候補になった理由を確認できます。'),
                       (22.0,'プロフィールを開き、得意なことや参加条件を確認します。')],
     'clip':'04-search.mp4'},
    {'chapter':'05 / チーム編成', 'title':'チーム案',
     'body':'活動条件 →\nチーム案 →\n人が確認',
     'note':'参加は自動確定しません',
     'voice_segments':[(0.8,'活動の場所、時間、必要な役割と人数を入力します。'),
                       (11.2,'候補チームを作ると、役割ごとに人と選定理由が表示されます。'),
                       (19.5,'参加できるかどうかは、本人に確認して人が判断します。')],
     'clip':'05-team.mp4'},
    {'chapter':'06 / 連絡文作成', 'title':'連絡文を作る',
     'body':'相手を探す →\n文面作成 →\nデモ送信を確認',
     'note':'実際の送信はしません',
     'voice_segments':[(0.8,'名前でサポーターを絞り、プロフィールを確認します。'),
                       (12.0,'連絡方法と活動を選ぶと、相談文の下書きが作られます。'),
                       (20.0,'デモ送信は画面内の確認だけで、実際の連絡は行いません。')],
     'clip':'06-contact.mp4'},
    {'chapter':'おわりに', 'title':'アイデア共有用のデモ',
     'body':'活用や改変は、引き継ぐチームの判断で自由に。',
     'note':'非公式 ・ 架空データ ・ 本番環境未接続',
     'voice':'この動画はアイデア共有用です。実際の活用や改変は、引き継ぐチームで自由に判断してください。'},
]

def run(*args: str) -> None:
    subprocess.run(args, check=True)

def duration(path: Path) -> float:
    result = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(path)],
                            capture_output=True,text=True,check=True)
    return float(json.loads(result.stdout)['format']['duration'])

def make_bgm(path: Path, seconds: float) -> None:
    """A quiet original major-key instrumental, generated locally without samples."""
    rate = 24000
    beat = 0.625
    bar = beat * 4
    chords = [
        (60, 64, 67, 71), (55, 59, 62, 67),
        (57, 60, 64, 67), (53, 57, 60, 64),
        (60, 64, 67, 71), (55, 59, 62, 67),
        (53, 57, 60, 64), (55, 59, 62, 67),
    ]
    freq = lambda midi: 440.0 * 2 ** ((midi - 69) / 12)
    chord_freqs = [tuple(freq(note) for note in chord[:3]) for chord in chords]
    melody_freqs = [tuple(freq(chord[i] + 12) for i in (0, 1, 2, 1)) for chord in chords]
    total = round(seconds * rate)
    import array
    with wave.open(str(path), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(rate)
        buffer = array.array('h')
        for index in range(total):
            t = index / rate
            bar_index = int(t / bar)
            local = t - bar_index * bar
            chord = chord_freqs[bar_index % len(chords)]
            melody = melody_freqs[bar_index % len(chords)]
            pad_envelope = min(1.0, local / 0.22, (bar - local) / 0.22)
            pad = sum(math.sin(2 * math.pi * note * local) for note in chord) / 3
            beat_index = min(3, int(local / beat))
            note_time = local - beat_index * beat
            pluck_envelope = (1 - math.exp(-110 * note_time)) * math.exp(-5.0 * note_time)
            pluck = math.sin(2 * math.pi * melody[beat_index] * note_time)
            pluck += 0.22 * math.sin(4 * math.pi * melody[beat_index] * note_time)
            edge = min(1.0, t / 1.8, (seconds - t) / 1.8)
            sample = edge * (0.12 * pad_envelope * pad + 0.18 * pluck_envelope * pluck)
            buffer.append(int(max(-1.0, min(1.0, sample)) * 32767))
            if len(buffer) >= 24000:
                output.writeframes(buffer.tobytes())
                buffer = array.array('h')
        if buffer:
            output.writeframes(buffer.tobytes())

def make_slide(slide: dict[str,str], index: int, work: Path) -> Path:
    image = work / f'slide-{index:02d}.png'
    run('magick','-size','1920x1080','xc:#F7F8F3',str(image))
    if 'clip' in slide:
        for color,shape in [('#FFFFFF','roundrectangle 50,120 1530,1010 16,16'),
                            ('#DDE8E0','roundrectangle 1550,120 1870,1000 24,24'),
                            ('#FFFFFF','roundrectangle 1560,130 1860,990 18,18')]:
            run('magick',str(image),'-fill',color,'-draw',shape,str(image))
        x,ys,title_size,body_size=1585,(205,300,445,820),38,25
    else:
        run('magick',str(image),'-fill','#DDEFE4','-draw','roundrectangle 90,120 1830,960 34,34',str(image))
        x,ys,title_size,body_size=180,(245,355,555,822),82,48
    labels=[('chapter',slide['chapter'],x,ys[0],27,'#537668'),
            ('title',slide['title'],x,ys[1],title_size,'#182F27'),
            ('body',slide['body'],x,ys[2],body_size,'#334A40'),
            ('note',slide['note'],x,ys[3],20 if 'clip' in slide else 28,'#557264'),
            ('footer','アクションボード×マイタレント  |  非公式デモ',70,1015,22,'#617468')]
    for name,value,tx,ty,size,color in labels:
        if not value:
            continue
        label=work/f'{name}-{index:02d}.txt'
        label.write_text(value,encoding='utf-8')
        run('magick',str(image),'-font',str(FONT),'-pointsize',str(size),'-fill',color,
            '-gravity','NorthWest','-interline-spacing','16','-annotate',f'+{tx}+{ty}','@'+str(label),str(image))
    return image

def make_card(kind: str, number: str, title: str, subtitle: str, work: Path) -> Path:
    image = work / f'{kind}-{number}.png'
    background = '#E7F3EA' if kind == 'section' else '#F7F8F3'
    run('magick', '-size', '1920x1080', f'xc:{background}', str(image))
    run('magick', str(image), '-fill', '#FFFFFF',
        '-draw', 'roundrectangle 100,105 1820,970 36,36', str(image))
    run('magick', str(image), '-fill', '#37AA77',
        '-draw', 'roundrectangle 175,195 189,365 7,7', str(image))
    long_section = kind == 'section' and number == '02'
    labels = [
        (f'{kind}-eyebrow-{number}', f'アクションボード×マイタレント  /  {"対象者" if kind == "section" else "主な機能"}', 225, 205, 31, '#537668'),
        (f'{kind}-title-{number}', title, 225, 365 if long_section else 405,
         64 if long_section else 82, '#182F27'),
        (f'{kind}-subtitle-{number}', subtitle, 225, 695 if long_section else 640,
         34 if long_section else 40, '#426455'),
    ]
    for name, value, x, y, size, color in labels:
        label = work / f'{name}.txt'
        label.write_text(value, encoding='utf-8')
        run('magick', str(image), '-font', str(FONT), '-pointsize', str(size),
            '-fill', color, '-gravity', 'NorthWest', '-interline-spacing', '13',
            '-annotate', f'+{x}+{y}', '@' + str(label), str(image))
    return image

def make_card_segment(image: Path, name: str, length: float, work: Path) -> Path:
    segment = work / f'{name}.mp4'
    run('ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
        '-loop', '1', '-framerate', '30', '-i', str(image),
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=mono:sample_rate=48000',
        '-filter_complex',
        f'[0:v]fade=t=in:st=0:d=0.3:color=white,'
        f'fade=t=out:st={length-0.3:.3f}:d=0.3:color=white[v]',
        '-map', '[v]', '-map', '1:a', '-t', f'{length:.3f}',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', str(segment))
    return segment

def main() -> None:
    for command in ('magick','ffmpeg','ffprobe','say'):
        if not shutil.which(command):
            raise RuntimeError(f'Missing command: {command}')
    if not FONT.is_file():
        raise RuntimeError(f'Japanese font unavailable: {FONT}')
    for slide in SLIDES:
        if 'clip' in slide and not (CLIPS/slide['clip']).is_file():
            raise FileNotFoundError(CLIPS/slide['clip'])
    with tempfile.TemporaryDirectory(prefix='talent-demo-video-') as tmp:
        work=Path(tmp)
        segments=[]
        for index,slide in enumerate(SLIDES):
            if index == 1:
                card = make_card('section', '01', 'サポーター向け機能',
                                 '01 活動の記録   /   02 マイタレント   /   03 仲間の推薦', work)
                segments.append(make_card_segment(card, 'section-supporter', 4.2, work))
            elif index == 4:
                card = make_card('section', '02',
                                 '議員・党職員・\nエリアサポーター向け機能（予定）',
                                 '04 仲間探し   /   05 チーム編成   /   06 連絡文作成', work)
                segments.append(make_card_segment(card, 'section-staff', 4.8, work))
            if 'clip' in slide:
                chapter = slide['chapter'].split(' / ', 1)[0]
                card = make_card('chapter', chapter, f'{chapter}  {slide.get("card_title", slide["title"])}',
                                 slide['chapter'].split(' / ', 1)[1], work)
                segments.append(make_card_segment(card, f'chapter-{chapter}', 3.0, work))
            still=make_slide(slide,index,work)
            voice=work/f'voice-{index:02d}.wav'
            if 'voice_segments' in slide:
                parts=[]
                for part_index,(at,words) in enumerate(slide['voice_segments']):
                    speech=work/f'speech-{index:02d}-{part_index}.aiff'
                    part=work/f'voice-{index:02d}-{part_index}.wav'
                    run('say','-v','Kyoko','-r','195','-o',str(speech),words)
                    run('ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(speech),
                        '-af',f'atempo=0.7,adelay={round(at*1000)}:all=1',
                        '-ar','48000',str(part))
                    parts.append(part)
                inputs=[item for part in parts for item in ('-i',str(part))]
                mix=''.join(f'[{n}:a]' for n in range(len(parts)))
                run('ffmpeg','-hide_banner','-loglevel','error','-y',*inputs,
                    '-filter_complex',f'{mix}amix=inputs={len(parts)}:duration=longest:normalize=0[a]',
                    '-map','[a]',str(voice))
            else:
                speech=work/f'speech-{index:02d}.aiff'
                run('say','-v','Kyoko','-r','195','-o',str(speech),slide['voice'])
                # Audio runs at precisely 0.7 times the prior video's speaking speed.
                run('ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(speech),
                    '-af','atempo=0.7,adelay=450|450','-ar','48000',str(voice))
            source=CLIPS/slide['clip'] if 'clip' in slide else None
            operation_duration=duration(source) if source else 4.0
            length=max(duration(voice)+0.8,operation_duration+0.7)
            args=['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-framerate','30','-i',str(still)]
            if source:
                args+=['-i',str(source),'-i',str(voice)]
                video=(f'[1:v]fps=30,scale=1450:870,setsar=1,'
                       f'tpad=stop_mode=clone:stop_duration={length:.3f},'
                       f'trim=duration={length:.3f}[screen];'
                       f'[0:v][screen]overlay=x=60:y=135:shortest=1,'
                       f'fade=t=in:st=0:d=0.4:color=white,'
                       f'fade=t=out:st={length-0.45:.3f}:d=0.45:color=white[v];')
                audio_index=2
            else:
                args+=['-i',str(voice)]
                video=(f'[0:v]fade=t=in:st=0:d=0.4:color=white,'
                       f'fade=t=out:st={length-0.45:.3f}:d=0.45:color=white[v];')
                audio_index=1
            filters=video+f'[{audio_index}:a]apad,afade=t=out:st={length-0.5:.3f}:d=0.5[a]'
            segment=work/f'segment-{index:02d}.mp4'
            run(*args,'-filter_complex',filters,'-map','[v]','-map','[a]','-t',f'{length:.3f}',
                '-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p',
                '-c:a','aac','-b:a','128k','-ar','48000','-movflags','+faststart',str(segment))
            segments.append(segment)
        playlist=work/'playlist.txt'
        playlist.write_text(''.join(f"file '{part}'\n" for part in segments),encoding='utf-8')
        narration=work/'narrated.mp4'
        run('ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0',
            '-i',str(playlist),'-c','copy',str(narration))
        bgm=work/'original-bgm.wav'
        make_bgm(bgm,duration(narration))
        run('ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(narration),'-i',str(bgm),
            '-filter_complex','[1:a]volume=0.20[bg];[0:a][bg]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.9[a]',
            '-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','160k',
            '-movflags','+faststart',str(OUTPUT))
    print(f'Created {OUTPUT} ({duration(OUTPUT):.1f} seconds)')

if __name__=='__main__':
    main()
