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
DEFAULT_OPERATION_SPEED = 0.8
SCENE_SPEEDS = {'03-search.mp4': 0.4}  # Half of its previous 0.8x playback.
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

# Coordinates are on the 900x770 operation recording. Each pointer pauses at the
# button just before the corresponding captured screen changes.
POINTER = {
    '01-mission.mp4': {
        'path': [(0,700,300),(1.25,240,675),(1.9,240,675),(2.3,450,575),
                 (3.4,450,575),(4.2,600,300),(6.6,140,490),(7.2,140,490),(9.9,440,500)],
        'clicks': [(1.9,240,675),(3.4,450,575),(7.2,140,490)],
    },
    '02-mytalent.mp4': {
        'path': [(0,380,50),(1.4,90,145),(1.9,90,145),(3.0,500,400),
                 (5.2,430,145),(5.8,430,145),(7.0,500,400),(11.5,700,500)],
        'clicks': [(1.9,90,145),(5.8,430,145)],
    },
    '03-search.mp4': {
        'path': [(0,800,135),(0.5,800,135),(1.3,250,390),(1.7,250,390),
                 (3.5,790,350),(5.8,330,390),(6.3,330,390),(9.0,700,500)],
        'clicks': [(0.5,800,135),(1.7,250,390),(6.3,330,390)],
    },
    '04-team.mp4': {
        'path': [(0,220,150),(0.8,250,335),(1.1,250,335),(3.4,480,500),
                 (5.5,450,470),(5.9,450,470),(6.8,450,430),(9.6,600,430)],
        'clicks': [(1.1,250,335),(5.9,450,470)],
    },
    '05-contact.mp4': {
        'path': [(0,500,350),(0.7,100,330),(1.1,100,330),(3.8,350,450),
                 (4.4,350,450),(5.8,760,715),(6.1,760,715),(10.3,600,500)],
        'clicks': [(1.1,100,330),(4.4,350,450),(6.1,760,715)],
    },
}

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

def make_pointer_images(work: Path) -> tuple[Path,Path]:
    cursor=work/'pointer.png'
    ring=work/'click-ring.png'
    run('magick','-size','48x64','xc:none','-fill','#FFFFFF','-stroke','#183C32',
        '-strokewidth','3','-draw',"path 'M 5,4 L 5,49 L 16,38 L 25,58 L 34,54 L 25,34 L 42,32 Z'",str(cursor))
    run('magick','-size','76x76','xc:none','-fill','none','-stroke','#3DBB9B',
        '-strokewidth','5','-draw','circle 38,38 38,8',str(ring))
    return cursor,ring

def pointer_expression(points: list[tuple[float,int,int]], dimension: int) -> str:
    expression=str(points[-1][dimension])
    for before,after in reversed(list(zip(points,points[1:]))):
        start,value=before[0],before[dimension]
        end,next_value=after[0],after[dimension]
        slope=(next_value-value)/(end-start)
        # max/min keeps the pointer at its first coordinate before t=0.
        expression=(f'if(lt(t,{end:.3f}),{value}+({slope:.5f})*'
                    f'max(0\,min({end-start:.3f}\,t-{start:.3f})),{expression})')
    return expression

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
        cursor,ring=make_pointer_images(work)
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
            operation_speed=SCENE_SPEEDS.get(slide.get('clip',''),DEFAULT_OPERATION_SPEED)
            operation_duration=duration(source)/operation_speed if source else 4.0
            length=max(duration(voice)+0.8,operation_duration+0.7)
            args=['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-framerate','30','-i',str(still)]
            if source:
                args+=['-i',str(source),'-loop','1','-framerate','30','-i',str(cursor),
                       '-loop','1','-framerate','30','-i',str(ring),'-i',str(voice)]
                track=POINTER[slide['clip']]
                clicks=[(at/operation_speed,px,py) for at,px,py in track['clicks']]
                video=(f'[1:v]setpts=PTS/{operation_speed},fps=30,scale=900:770,setsar=1,'
                       f'tpad=stop_mode=clone:stop_duration={length:.3f},'
                       f'trim=duration={length:.3f}[screen0];'
                       f'[3:v]split={len(clicks)}'+''.join(f'[ring{n}]' for n in range(len(clicks)))+';')
                for n,(at,px,py) in enumerate(clicks):
                    video+=(f'[screen{n}][ring{n}]overlay=x={px-38}:y={py-38}:'
                            f"enable='between(t,{at:.3f},{at+0.35:.3f})'[screen{n+1}];")
                slowed_path=[(at/operation_speed,px,py) for at,px,py in track['path']]
                x=pointer_expression(slowed_path,1)
                y=pointer_expression(slowed_path,2)
                video+=(f"[screen{len(clicks)}][2:v]overlay=x='{x}':y='{y}':eval=frame[withcursor];"
                        f'[0:v][withcursor]overlay=x=60:y=170:shortest=1,'
                        f'fade=t=in:st=0:d=0.25,fade=t=out:st={length-0.35:.3f}:d=0.35[v];')
                audio_index=4
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
