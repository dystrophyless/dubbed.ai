# Demo fixture verification

Date: 2026-10-20 (Asia/Qyzylorda)  
Worktree: `D:\Program\python\Dubbed`; generated assets and scripts only in this bounded fixture assignment.  
Base revision: `2f70ac94d059585f9608df39efbc96be555c3f98`; the shared worktree contains parallel edits by the coordinating executor. No commit was created.  
Source contract: issue #10, SPEC-002 §7.1–7.2 and FE-AC-08/10.  
Fixture provenance: original flat illustration, locally synthesized System.Speech dialogue, and deterministic tone ambience. No remote or third-party audiovisual media.

## Result

Generated and fully decoded the silent scene, original-audio scene, and prepared sample output. FFmpeg reports H.264 High/yuv420p at 640×360 and 10 fps in all three; the two audible MP4s contain AAC-LC mono audio at 22.05 kHz. Each file reports exactly 54.00 seconds. All WAV tracks have the same 54-second, mono, 22.05 kHz PCM timeline. The continuous English monologue measures 38.108 seconds; EN/RU dialogue intervals overlap, the annotations include laughter and a gasp caption, and the A/B speaker stems and background bed each span the complete timeline. Scene video has no baked-in text/subtitles. Exact file bytes and SHA-256 are in `frontend/public/demo/checksums.json`.

`finished-demo.mp4` is a prepared synthetic fixture output and is explicitly labelled as not rendered from user takes. Speaker stems were authored separately by the fixture generator; this does not prove speech separation. The laughter and gasp are synthetic vocal interjections, not human performances or evidence of a detector. Browser playback, human listening, real speech separation, microphone capture, and arbitrary-upload matching were not evaluated in this asset-only check.

## Reproduction and checks

Generation command:

```powershell
.\frontend\scripts\generate-fixtures.ps1
```

The generator used Python 3.13.6, Pillow 12.2.0, `imageio-ffmpeg` 0.6.0 / FFmpeg 7.1, Microsoft Zira Desktop (`en-US`) and Microsoft Irina Desktop (`ru-RU`). The no-cost encoder wheel was installed under `%TEMP%\dubbed-imageio-ffmpeg`; it did not modify the project's runtime dependency files.

The check decoded each MP4's full streams with the same FFmpeg binary; `ffmpeg -i <file>` reported stream codecs and durations. WAV duration/rate/channel counts were read from their headers; speaker annotation times were derived from the generated WAV frame counts. `git diff --check` passed for the scoped asset/script/evidence paths. All commands completed successfully; there was no commit or GitHub mutation from this task.
