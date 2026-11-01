"""Prepare bounded source + distinct illustrative output; never a user's render."""
import os
import subprocess
import sys
import tempfile
from urllib.request import urlretrieve
from pathlib import Path

sys.path.insert(0, str(Path(os.environ['TEMP']) / 'dubbed-lowfi-media-tools'))
import imageio_ffmpeg

root = Path(__file__).parent / 'public' / 'media'
source = Path(tempfile.gettempdir()) / 'dubbed-lowfi-sintel-source.mp4'
if not source.exists():
    urlretrieve('https://raw.githubusercontent.com/chrisdavidmills/html5-captions-and-subtitles-content-kit/gh-pages/demo/video/sintel-short.mp4', source)
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
def run(*args):
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', *map(str,args)], check=True)

run('-ss', '40.4', '-i', source, '-t', '13.4', '-vf', 'scale=960:-2', '-c:v', 'libx264', '-crf', '23', '-c:a', 'aac', '-movflags', '+faststart', root/'scene.mp4')
run('-i', root/'scene.mp4', '-i', root/'take-0.wav', '-i', root/'take-1.wav', '-i', root/'take-2.wav', '-filter_complex', '[1:a]adelay=250|250[a];[2:a]adelay=5350|5350[b];[3:a]adelay=8750|8750[c];[a][b][c]amix=inputs=3:normalize=0,apad[out]', '-map', '0:v', '-map', '[out]', '-c:v', 'copy', '-c:a', 'aac', '-t', '13.4', '-movflags', '+faststart', root/'example-dub.mp4')
print('Prepared a 13.4-second scene and a distinct synthetic-performance output fixture.')
