import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useViewState } from "@/components/dev/view-state";
import { Icon } from "@/components/icons";
import { Stack } from "@/components/layout";
import { AudioTrack, SceneColumn, TurnLine, VideoStage, VolumeControl, demoPeaks, formatSeconds, type RecordState } from "@/components/media";
import { Button, Card, CardBody, CardFooter, CardHeader, Dialog, SegmentedControl, Text, TextLink } from "@/components/ui";
import { cx } from "@/components/ui/kit/cx";
import pop from "@/components/ui/kit/Popover.module.css";
import { useAnchoredPosition, useDismiss } from "@/components/ui/kit/usePopover";
import s from "./studio-a.module.css";

/*
 * Phase 4 — concept A reworked (low-fi). Three variants that differ ONLY in where "Previous" lives:
 *   a-back-top    small ‹ in the header, left of the progress strip (slot reserved on turn 1)
 *   a-back-row    fixed icon slot at the left of the action row (slot reserved on turn 1)
 *   a-back-sides  ‹ / › beside the video (overlaid on its edges on phones); › only with a take
 * Everything else is one shared component (StudioA). Review aid: ?state=no-take|recording|saved & ?turn=1..12.
 */

const STATES = ["no-take", "recording", "saved"] as const;
type Preview = (typeof STATES)[number];
const VARIANTS = ["a-back-top", "a-back-row", "a-back-sides"] as const;
type VariantId = (typeof VARIANTS)[number];
type Back = "top" | "row" | "sides";
const BACK: Record<VariantId, Back> = { "a-back-top": "top", "a-back-row": "row", "a-back-sides": "sides" };
const TURNS = ["1", "3", "12"] as const;

const WINDOW = 4.4;
const TOTAL = 12;
const RATIO = 16 / 9;
const ORIGINAL = demoPeaks(160);
const TAKE = demoPeaks(160, 31);
const LINES = ["line0", "line1", "line2", "line3"] as const;

export function ABackTopConcept() {
  return <StudioA id="a-back-top" />;
}
export function ABackRowConcept() {
  return <StudioA id="a-back-row" />;
}
export function ABackSidesConcept() {
  return <StudioA id="a-back-sides" />;
}

function StudioA({ id }: { id: VariantId }) {
  const preview = useViewState(STATES);
  const [params] = useSearchParams();
  const raw = Number.parseInt(params.get("turn") ?? "", 10);
  const turn = Number.isFinite(raw) ? Math.min(TOTAL, Math.max(1, raw)) : 3;
  return <StudioBody key={`${preview}-${turn}`} id={id} preview={preview} turn={turn} />;
}

type Studio = ReturnType<typeof useStudio>;

/** Demo-only state: turn index, takes per turn, record state, a fake clock for recording and playback. */
function useStudio(preview: Preview, turn: number, onBuild: () => void) {
  const [index, setIndex] = useState(turn - 1);
  const [dir, setDir] = useState<"next" | "prev" | "none">("none");
  // every turn before the current one has a take; the current one only in the "saved" preview
  const [takes, setTakes] = useState<Set<number>>(() => new Set(Array.from({ length: preview === "saved" ? turn : turn - 1 }, (_, i) => i)));
  const [rec, setRec] = useState<RecordState>(preview === "recording" ? "recording" : preview === "saved" ? "saved" : "idle");
  const [elapsed, setElapsed] = useState(preview === "recording" ? 2.9 : 0);
  const [live, setLive] = useState(false); // a ?state=recording preview is frozen at "1.5 s left"; a real click runs the clock
  // arrival on a turn without a take: the fragment plays once by itself
  const [playing, setPlaying] = useState<"none" | "original" | "take">(preview === "no-take" ? "original" : "none");

  useEffect(() => {
    const running = (rec === "recording" && live) || playing !== "none";
    if (!running) return;
    const started = performance.now();
    const id = window.setInterval(() => {
      const e = (performance.now() - started) / 1000;
      if (e < WINDOW) return setElapsed(e);
      if (rec === "recording") {
        setElapsed(WINDOW);
        setRec("saving");
      } else {
        setElapsed(0);
        setPlaying("none");
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [rec, live, playing]);

  useEffect(() => {
    if (rec !== "saving") return;
    const id = window.setTimeout(() => {
      setRec("saved");
      setElapsed(0);
      setTakes((t) => new Set(t).add(index));
    }, 700);
    return () => window.clearTimeout(id);
  }, [rec, index]);

  const hasTake = takes.has(index);
  const busy = rec === "recording" || rec === "saving";
  const last = index >= TOTAL - 1;
  const go = (to: number) => {
    setDir(to > index ? "next" : "prev");
    setIndex(to);
    setRec(takes.has(to) ? "saved" : "idle");
    setPlaying(takes.has(to) ? "none" : "original");
    setElapsed(0);
  };
  return {
    index, dir, total: TOTAL, rec, elapsed, playing, hasTake, busy, last, takes,
    canPrev: index > 0 && !busy,
    canNext: hasTake && !busy,
    lineKey: LINES[index % LINES.length],
    record: () => { setPlaying("none"); setElapsed(0); setLive(true); setRec("recording"); },
    stop: () => setRec("saving"),
    play: (what: "original" | "take") => {
      if (busy) return;
      setElapsed(0);
      setPlaying((p) => (p === what ? "none" : what));
    },
    prev: () => index > 0 && !busy && go(index - 1),
    next: () => {
      if (!hasTake || busy) return;
      if (last) onBuild();
      else go(index + 1);
    },
  };
}

function StudioBody({ id, preview, turn }: { id: VariantId; preview: Preview; turn: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const leave = () => navigate("/prototypes/concepts");
  const st = useStudio(preview, turn, leave);
  const back = BACK[id];
  const [ask, setAsk] = useState(false);
  const exit = () => (st.busy ? setAsk(true) : leave());
  return (
    <div className={s.page} data-back={back} data-testid="studio-a" style={{ "--ratio": RATIO } as CSSProperties}>
      <main id="main" className={s.column}>
        <header className={s.head}>
          <Button variant="ghost" size="lg" icon={<Icon name="close" />} aria-label={t("concepts.studioA.exit")} onClick={exit} />
          <div className={s.headMid}>
            <h1 className={s.title}>{t("concepts.studio.project")}</h1>
            <div className={s.progressRow}>
              {back === "top" && (
                <span className={s.backSlot}>
                  {st.index > 0 && (
                    <span className={s.keep} data-hidden={st.busy || undefined}>
                      <Button variant="ghost" size="sm" icon={<Icon name="prev" size={14} />} aria-label={t("concepts.studioA.prev")} onClick={st.prev} />
                    </span>
                  )}
                </span>
              )}
              <Progress st={st} />
            </div>
          </div>
          <VolumeButton />
        </header>

        <div key={st.index} className={s.turnIn} data-dir={st.dir}>
        <SceneColumn ratio={RATIO} maxHeight="var(--video-h)">
          <div className={s.videoWrap}>
            <VideoStage label={t("concepts.studio.video")} ratio={RATIO} maxHeight="var(--video-h)">
              <span className={s.videoLabel} aria-hidden="true">
                {t("concepts.studio.videoBox", { ratio: "16:9" })}
                {st.playing !== "none" && ` · ${t(st.playing === "take" ? "concepts.studio.playingTake" : "concepts.studio.playingOriginal")}`}
                {st.rec === "recording" && ` · ${t("concepts.studioA.playingMuted")}`}
              </span>
            </VideoStage>
            {back === "sides" && !st.busy && (
              <>
                {st.index > 0 && (
                  <span className={s.side} data-side="prev">
                    <Button variant="secondary" size="lg" icon={<Icon name="prev" size={20} />} aria-label={t("concepts.studioA.prev")} onClick={st.prev} />
                  </span>
                )}
                {st.hasTake && !st.last && (
                  <span className={s.side} data-side="next">
                    <Button variant="secondary" size="lg" icon={<Icon name="next" size={20} />} aria-label={t("concepts.studioA.next")} onClick={st.next} />
                  </span>
                )}
              </>
            )}
          </div>
          <TurnLine text={t(`concepts.studio.${st.lineKey}`)} />
          <AudioTrack
            label={t("concepts.studio.track")}
            original={ORIGINAL}
            take={st.rec === "recording" || st.rec === "saving" || st.hasTake ? TAKE : undefined}
            takeProgress={st.rec === "recording" ? st.elapsed / WINDOW : 1}
            mode={st.rec === "recording" ? "recording" : st.playing !== "none" ? "playing" : "idle"}
            progress={st.elapsed / WINDOW}
          />
        </SceneColumn>
        </div>

        <Actions st={st} back={back} />
      </main>

      <div className={s.noteWrap}>
        <Note id={id} preview={preview} turn={turn} />
      </div>

      <Dialog
        open={ask}
        onClose={() => setAsk(false)}
        title={t("sg.feedback.leaveTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAsk(false)}>{t("sg.feedback.stay")}</Button>
            <Button variant="secondary" onClick={leave}>{t("sg.feedback.leaveNoSave")}</Button>
            <Button onClick={leave}>{t("sg.feedback.saveLeave")}</Button>
          </>
        }
      >
        <p className={s.dialogText}>{t("sg.feedback.leaveText")}</p>
      </Dialog>
    </div>
  );
}

/** Progress dots: one per turn, display only. The quiet "3 of 12" carries the meaning (also for screen readers). */
function Progress({ st }: { st: Studio }) {
  const { t } = useTranslation();
  return (
    <>
      {/* page-control dots: done = accent, ahead = grey, current = a pill that grows out of its dot; smaller for long scenes */}
      <span className={s.dots} aria-hidden="true" data-testid="turn-strip" data-many={st.total > 16 || undefined}>
        {Array.from({ length: st.total }, (_, i) => (
          <span key={i} className={s.dot} data-s={i === st.index ? "current" : st.takes.has(i) ? "done" : "ahead"} />
        ))}
      </span>
      <span className={s.count} aria-hidden="true">
        <span key={st.index} className={s.countNum} data-dir={st.dir}>{st.index + 1}</span>
        <span className={s.countOf}>{t("concepts.studioA.countOf", { total: st.total })}</span>
      </span>
      <span className="sr-only">{t("media.turn.of", { n: st.index + 1, total: st.total })}</span>
    </>
  );
}

/*
 * The action row. A button that stays keeps its position: Original never moves, Record → Stop → Record again sit in one
 * slot, Next appears in the slot that carried the time hint. Wide: [‹] [Original] [My take] ··· [Record] [Next];
 * phone (≤ 480px): [‹] [Original] [Record] / [ ] [My take] [Next].
 */
function Actions({ st, back }: { st: Studio; back: Back }) {
  const { t, i18n } = useTranslation();
  const lng = i18n.resolvedLanguage;
  const recording = st.rec === "recording";
  const saved = st.hasTake && !st.busy;
  const hint =
    recording ? t("media.record.left", { s: formatSeconds(Math.max(0, WINDOW - st.elapsed), lng) })
    : st.rec === "saving" ? t("media.record.saving")
    : !st.hasTake ? t("media.record.window", { s: formatSeconds(WINDOW, lng) })
    : null;
  const origOn = st.playing === "original";
  const takeOn = st.playing === "take";
  return (
    <div className={s.actions} data-back={back} data-testid="studio-actions">
      <div className={s.left}>
        {back === "row" && (
          <span className={cx(s.cell, s.backCell)}>
            {st.index > 0 && (
              <span className={s.keep} data-hidden={st.busy || undefined}>
                <Button variant="secondary" size="lg" icon={<Icon name="prev" />} aria-label={t("concepts.studioA.prev")} onClick={st.prev} />
              </span>
            )}
          </span>
        )}
        <span className={cx(s.cell, s.origCell, s.keep)} data-hidden={st.busy || undefined}>
          <Button variant="secondary" size="lg" icon={<Icon name={origOn ? "pause" : "play"} />} aria-pressed={origOn} onClick={() => st.play("original")}>
            {t("concepts.studio.original")}
          </Button>
        </span>
        {saved && (
          <span className={cx(s.cell, s.takeCell)}>
            <Button variant="secondary" size="lg" icon={<Icon name={takeOn ? "pause" : "play"} />} aria-pressed={takeOn} onClick={() => st.play("take")}>
              {t("concepts.studio.myTake")}
            </Button>
          </span>
        )}
      </div>
      <div className={s.right}>
        <span className={cx(s.cell, s.recCell)}>
          {st.busy ? (
            <Button variant="primary" size="lg" className={s.recBtn} icon={<Icon name="stop" />} onClick={st.stop} loading={st.rec === "saving"}>
              {t("media.record.stop")}
            </Button>
          ) : st.hasTake ? (
            <Button variant="secondary" size="lg" className={s.againBtn} icon={<Icon name="record" />} onClick={st.record}>
              {t("media.record.again")}
            </Button>
          ) : (
            <Button variant="primary" size="lg" className={s.recBtn} icon={<Icon name="record" />} onClick={st.record}>
              {t("media.record.start")}
            </Button>
          )}
        </span>
        {/* Next and the time hint share one slot; the slot is always as wide as Next, so Record never moves */}
        <span className={cx(s.cell, s.nextCell)}>
          <span className={s.keep} data-hidden={!saved || undefined}>
            <Button variant="primary" size="lg" iconRight={<Icon name="forward" />} onClick={st.next} tabIndex={saved ? undefined : -1}>
              {st.last ? t("concepts.studioA.build") : t("media.turn.next")}
            </Button>
          </span>
          {!saved && <span className={s.hint} aria-live="polite" data-recording={recording || undefined}>{hint}</span>}
        </span>
      </div>
    </div>
  );
}

/** Volume of the original voice: an icon button opening a small popover with the kit's VolumeControl. */
function VolumeButton() {
  const { t } = useTranslation();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const anchor = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pos = useAnchoredPosition(anchor, panel, open, "bottom-end");
  const close = useCallback(() => setOpen(false), []);
  const refs = useMemo(() => [anchor, panel] as RefObject<HTMLElement | null>[], []);
  useDismiss(open, close, refs, anchor);
  const placed = pos !== null;
  useLayoutEffect(() => {
    if (open && placed) panel.current?.querySelector<HTMLElement>("[role=slider]")?.focus({ preventScroll: true });
  }, [open, placed]);
  const label = t("concepts.studio.originalVolume");
  return (
    <>
      <Button
        ref={anchor}
        variant="ghost"
        size="lg"
        icon={<Icon name={volume === 0 ? "mute" : volume < 0.5 ? "volumeLow" : "volume"} />}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-volume` : undefined}
        onClick={() => setOpen((o) => !o)}
      />
      {open &&
        createPortal(
          <div
            ref={panel}
            id={`${id}-volume`}
            role="dialog"
            aria-label={label}
            className={cx(pop.surface, s.volumePanel, !pos && pop.measuring)}
            data-side={pos?.side}
            style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0 }}
            onKeyDown={(e) => e.key === "Tab" && setOpen(false)}
          >
            <VolumeControl label={label} value={volume} onChange={setVolume} />
          </div>,
          document.body,
        )}
    </>
  );
}

function Note({ id, preview, turn }: { id: VariantId; preview: Preview; turn: number }) {
  const { t } = useTranslation();
  const { search } = useLocation();
  const [params, setParams] = useSearchParams();
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  const turnValue = (TURNS as readonly string[]).includes(String(turn)) ? (String(turn) as (typeof TURNS)[number]) : "3";
  return (
    <Card padding="none" data-testid="concept-note">
      <CardHeader title={t("concepts.studioA.note.title", { name: t(`concepts.studioA.v.${id}.name`) })} />
      <CardBody>
        <Stack gap={12}>
          <Text tone="strong" medium>{t(`concepts.studioA.v.${id}.idea`)}</Text>
          <dl className={s.tradeoffs}>
            {(["pros", "cons"] as const).map((r) => (
              <div key={r} className={s.tradeoff}>
                <dt>{t(`concepts.studioA.note.${r}`)}</dt>
                <dd>{t(`concepts.studioA.v.${id}.${r}`)}</dd>
              </div>
            ))}
          </dl>
          <Text size="sm" tone="muted">{t("concepts.studioA.note.fixed")}</Text>
          <div className={s.pickers}>
            <SegmentedControl<Preview>
              aria-label={t("concepts.studioA.note.state")}
              size="sm"
              variant="tray"
              value={preview}
              onChange={(v) => set("state", v === "no-take" ? null : v)}
              options={STATES.map((v) => ({ value: v, label: t(`concepts.studio.note.states.${v}`) }))}
            />
            <SegmentedControl<(typeof TURNS)[number]>
              aria-label={t("concepts.studioA.note.turn")}
              size="sm"
              variant="tray"
              value={turnValue}
              onChange={(v) => set("turn", v === "3" ? null : v)}
              options={TURNS.map((v) => ({ value: v, label: t(`concepts.studioA.note.turns.${v}`) }))}
            />
          </div>
        </Stack>
      </CardBody>
      <CardFooter>
        <div className={s.others}>
          <Text size="sm" tone="muted">{t("concepts.studioA.note.others")}</Text>
          {VARIANTS.filter((v) => v !== id).map((v) => (
            <TextLink key={v} to={`/prototypes/concepts/studio/${v}${search}`}>{t(`concepts.studioA.v.${v}.name`)}</TextLink>
          ))}
          <TextLink to="/prototypes/concepts">{t("concepts.studioA.note.all")}</TextLink>
        </div>
      </CardFooter>
    </Card>
  );
}
