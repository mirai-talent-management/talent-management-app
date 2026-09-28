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
    {'chapter':'01 / 活動からスキルへ', 'title':'活動が、経験になる',
     'body':'ミッション達成を記録すると、\n活動からスキル候補が見つかります。\n公開する内容は本人が決めます。',
     'note':'活動とスキル画面の実操作',
     'voice':'ミッションの達成を記録すると、活動の経験からスキル候補が見つかります。公開する内容は、本人が確認して決めます。',
     'clip':'01-mission.mp4'},
    {'chapter':'02 / マイタレント', 'title':'自分の得意を登録',
     'body':'経験や得意、活動できる条件を登録。\nインタビューで強みを整理します。',
     'note':'インタビューは外部AIを使わない Mock AI',
     'voice':'マイタレントでは、経験や得意、活動できる条件を登録できます。インタビューで、自分の強みを整理することもできます。',
     'clip':'02-mytalent.mp4'},
    {'chapter':'03 / 仲間探し', 'title':'自然な言葉で検索',
     'body':'活動内容を文章で入力し、\n候補とその理由、プロフィールを確認。',
     'note':'検索はローカルの辞書・規則によるサンプル',
     'voice':'活動内容を自然な文章で入力すると、候補と、その理由を確認できます。プロフィールを開いて、得意や参加条件も見られます。',
     'clip':'03-search.mp4'},
    {'chapter':'04 / チーム編成', 'title':'活動に合うチーム案',
     'body':'日時・場所・役割・人数から提案。\n理由を見て、人が判断します。',
     'note':'自動確定・自動連絡は行いません',
     'voice':'活動の日時や場所、必要な役割と人数から、チーム案を作れます。役割ごとの候補と理由を見て、最後は人が判断します。',
     'clip':'04-team.mp4'},
    {'chapter':'05 / 連絡文作成', 'title':'声をかける文面を作る',
     'body':'メールや Slack 向けの文面を作成。\n活動の相談を始められます。',
     'note':'デモでは実際の送信を行いません',
     'voice':'候補のプロフィールから、メールやスラック向けの連絡文を作れます。このデモでは、実際の送信は行いません。',
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
        for color,shape in [('#FFFFFF','roundrectangle 50,160 970,950 16,16'),
                            ('#DDE8E0','roundrectangle 1020,160 1870,940 24,24'),
                            ('#FFFFFF','roundrectangle 1030,170 1860,930 18,18')]:
            run('magick',str(image),'-fill',color,'-draw',shape,str(image))
        x,ys,title_size,body_size=1080,(240,355,540,827),56,36
    else:
        run('magick',str(image),'-fill','#DDEFE4','-draw','roundrectangle 90,120 1830,960 34,34',str(image))
        x,ys,title_size,body_size=180,(245,355,555,822),82,48
    labels=[('chapter',slide['chapter'],x,ys[0],27,'#537668'),
            ('title',slide['title'],x,ys[1],title_size,'#182F27'),
            ('body',slide['body'],x,ys[2],body_size,'#334A40'),
            ('note',slide['note'],x,ys[3],28,'#557264'),
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
            speech=work/f'speech-{index:02d}.aiff'
            voice=work/f'voice-{index:02d}.wav'
            run('say','-v','Kyoko','-r','195','-o',str(speech),slide['voice'])
            # Audio runs at precisely 0.7 times the prior video's speaking speed.
            run('ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(speech),
                '-af','atempo=0.7,adelay=450|450','-ar','48000',str(voice))
            source=CLIPS/slide['clip'] if 'clip' in slide else None
            length=max(duration(voice)+0.8,duration(source) if source else 4.0)
            args=['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-framerate','30','-i',str(still)]
            if source:
                args+=['-i',str(source),'-i',str(voice)]
                video=(f'[1:v]fps=30,scale=900:770,setsar=1,tpad=stop_mode=clone:stop_duration={length:.3f},'
                       f'trim=duration={length:.3f}[screen];[0:v][screen]overlay=x=60:y=170:shortest=1,'
                       f'fade=t=in:st=0:d=0.25,fade=t=out:st={length-0.35:.3f}:d=0.35[v];')
                audio_index=2
            else:
                args+=['-i',str(voice)]
                video=(f'[0:v]fade=t=in:st=0:d=0.25,'
                       f'fade=t=out:st={length-0.35:.3f}:d=0.35[v];')
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
