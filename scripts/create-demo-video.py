#!/usr/bin/env python3
"""Build a narrated demo video from five recordings of actual browser operation.

Requires macOS say, ImageMagick, and FFmpeg. No network access or API keys.
"""
from __future__ import annotations
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLIPS = ROOT / 'docs/demo-video-clips'
OUTPUT = ROOT / 'docs/action-board-talent-5-features.mp4'
FONT = Path('/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc')
SLIDES = [
    {'chapter':'INTRO', 'title':'Action Board × Talent',
     'body':'5つの主な機能を、\n実際の操作画面で紹介します。',
     'note':'非公式の統合提案 ・ 架空データ',
     'voice':'アクションボードとマイタレント。5つの主な機能を、実際の操作画面で紹介します。'},
    {'chapter':'01 / 活動の記録', 'title':'活動が経験に',
     'body':'① ミッションを達成\n② スキル候補を見る\n③ 本人が承認する',
     'note':'活動記録から見つかった\n候補は本人が確認',
     'voice_segments':[(0.8,'サンプルのミッションを開き、今回担当した役割を選びます。'),
                       (8.6,'達成を記録すると、担当経験がスキル候補として見つかります。'),
                       (17.0,'公開する内容は、本人が確認して承認します。')],
     'clip':'01-mission.mp4'},
    {'chapter':'02 / マイタレント', 'title':'自分の得意',
     'body':'① 経験を答える\n② スキル候補を確認\n③ 本人承認でプロフィールへ',
     'note':'ローカルの辞書・規則を使う\nMock AIのデモ',
     'voice_segments':[(0.8,'マイタレントで、自分の得意と経験を確認します。'),
                       (5.5,'AIインタビューで、経験を一つ入力します。'),
                       (15.5,'このデモでは、回答からスキル候補が見つかると、その場で確認できます。'),
                       (23.0,'候補の根拠と表現を本人が確かめて承認すると、プロフィールに反映されます。')],
     'clip':'02-mytalent.mp4'},
    {'chapter':'03 / 仲間探し', 'title':'仲間を探す',
     'body':'① 活動内容を入力\n② 候補と理由を見る\n③ プロフィールを確認',
     'note':'ローカルの辞書・規則を\n使った検索サンプル',
     'voice_segments':[(1.8,'活動の内容を文章で入力して、仲間を探します。'),
                       (11.3,'読み取った条件と、候補になった理由を確認できます。'),
                       (22.0,'プロフィールを開き、得意なことや参加条件を確認します。')],
     'clip':'03-search.mp4'},
    {'chapter':'04 / チーム編成', 'title':'チーム案',
     'body':'① 活動条件を入力\n② 役割別の候補を見る\n③ 理由を確認する',
     'note':'参加・連絡は\n自動確定しません',
     'voice_segments':[(0.8,'活動の場所、時間、必要な役割と人数を入力します。'),
                       (11.2,'候補チームを作ると、役割ごとに人と選定理由が表示されます。'),
                       (19.5,'参加できるかどうかは、本人に確認して人が判断します。')],
     'clip':'04-team.mp4'},
    {'chapter':'05 / 連絡文作成', 'title':'連絡文を作る',
     'body':'① 名前で候補を探す\n② 活動を選んで文面作成\n③ デモ送信を確認',
     'note':'架空の宛先を使い\n実際の送信はしません',
     'voice_segments':[(0.8,'名前でサポーターを絞り、プロフィールを確認します。'),
                       (12.0,'連絡方法と活動を選ぶと、相談文の下書きが作られます。'),
                       (20.0,'デモ送信は画面内の確認だけで、実際の連絡は行いません。')],
     'clip':'05-contact.mp4'},
    {'chapter':'OUTRO', 'title':'アイデア共有用のデモ',
     'body':'活用・設計・改変は、\n引き継ぐチームの判断で自由に。',
     'note':'非公式 ・ 架空データ ・ 本番環境未接続',
     'voice':'この動画はアイデア共有用です。実際の活用や改変は、引き継ぐチームで自由に判断してください。'},
]

def run(*args: str) -> None:
    subprocess.run(args, check=True)

def duration(path: Path) -> float:
    result = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(path)],
                            capture_output=True,text=True,check=True)
    return float(json.loads(result.stdout)['format']['duration'])

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
            ('footer','Action Board × Talent  |  非公式ローカル統合デモ  |  すべて架空データ',70,1015,22,'#617468')]
    for name,value,tx,ty,size,color in labels:
        label=work/f'{name}-{index:02d}.txt'
        label.write_text(value,encoding='utf-8')
        run('magick',str(image),'-font',str(FONT),'-pointsize',str(size),'-fill',color,
            '-gravity','NorthWest','-interline-spacing','16','-annotate',f'+{tx}+{ty}','@'+str(label),str(image))
    return image

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
        run('ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0',
            '-i',str(playlist),'-c','copy','-movflags','+faststart',str(OUTPUT))
    print(f'Created {OUTPUT} ({duration(OUTPUT):.1f} seconds)')

if __name__=='__main__':
    main()
