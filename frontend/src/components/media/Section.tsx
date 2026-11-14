import { useEffect, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/affect/button";

/*
 * Section playback — plays only the selected section of a video (New dub: "Play section"), then stops and returns to
 * the section's start. Pause keeps the place; Play resumes from it. Changing the section stops playback and shows the
 * section's first frame. `pos` (seconds, or null when stopped) feeds RangeSelector's playhead.
 *
 * `toMedia` maps section time to the media element's time (identity by default). Prototypes use it to stand a short
 * demo clip in for a long video (the clip loops); real pages leave it out.
 */
const identity = (t: number) => t;

export function useSectionPlayback(
  videoRef: RefObject<HTMLVideoElement | null>,
  start: number,
  end: number,
  toMedia: (t: number) => number = identity,
) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState<number | null>(null);
  const resume = useRef<number | null>(null);
  const map = useRef(toMedia);
  useEffect(() => {
    map.current = toMedia;
  }, [toMedia]);

  // a new section stops playback (state reset during render, React's "adjust state on prop change" pattern)
  const section = `${start}-${end}`;
  const [shown, setShown] = useState(section);
  if (shown !== section) {
    setShown(section);
    setPlaying(false);
    setPos(null);
  }

  // … and shows its first frame
  useEffect(() => {
    resume.current = null;
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    seek(v, map.current(start));
  }, [videoRef, start, end]);

  useEffect(() => {
    if (!playing) return;
    const v = videoRef.current;
    const from = resume.current ?? start;
    const t0 = performance.now();
    let cancelled = false;
    if (v) {
      seek(v, map.current(from));
      v.play().catch((e: unknown) => {
        // paused before playback started: the browser cancels play() — that is not a refusal of sound
        if (cancelled || (e instanceof DOMException && e.name !== "NotAllowedError")) return;
        // the browser refused sound: play the picture silently rather than not at all
        v.muted = true;
        return v.play().catch(() => undefined);
      });
    }
    let raf = 0;
    const tick = () => {
      const p = from + (performance.now() - t0) / 1000;
      if (p >= end) {
        resume.current = null;
        setPlaying(false);
        setPos(null);
        if (v) {
          v.pause();
          seek(v, map.current(start));
        }
        return;
      }
      // keep the picture in step with the clock (also wraps a looping stand-in clip)
      if (v && Math.abs(v.currentTime - map.current(p)) > 0.35) seek(v, map.current(p));
      resume.current = p;
      setPos(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      v?.pause();
    };
  }, [playing, videoRef, start, end]);

  return {
    playing,
    pos,
    toggle: () => setPlaying((p) => !p),
    stop: () => setPlaying(false),
  };
}

function seek(v: HTMLVideoElement, t: number) {
  try {
    v.currentTime = t;
  } catch {
    /* not seekable yet — the first frame stays */
  }
}

/** "Play section" / "Pause" — secondary, the same size as the action it sits beside. */
export function PlaySectionButton({
  playing, onToggle, disabled, className,
}: { playing: boolean; onToggle: () => void; disabled?: boolean; className?: string }) {
  const { t } = useTranslation();
  return (
    <Button
      variant="secondary"
      size="lg"
      className={className}
      icon={<Icon name={playing ? "pause" : "play"} />}
      onClick={onToggle}
      disabled={disabled}
      data-testid="play-section"
    >
      {playing ? t("media.section.pause") : t("media.section.play")}
    </Button>
  );
}
