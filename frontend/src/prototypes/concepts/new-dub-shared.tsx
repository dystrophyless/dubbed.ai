import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { AppShell } from "@/app/shells/Shells";
import { useViewState } from "@/components/dev/view-state";
import { Icon } from "@/components/icons";
import { Cluster, Stack } from "@/components/layout";
import { VideoStage, creditsFor, formatTime } from "@/components/media";
import {
  Button, Card, CardBody, CardFooter, CardHeader, IconTile, ProgressBar, Select, Text, TextLink, toast,
} from "@/components/ui";
import s from "./new-dub.module.css";

/*
 * Phase 4 — NEW DUB concepts (low-fi, design-architect). Structure and hierarchy only; a grey box stands in for the video.
 * Route: /prototypes/concepts/new-dub/<concept>?state=empty|uploading|ready|limit|error|short (&reason=length|size|type)
 * Every concept uses the same demo state (useNewDub) and the same pieces (Picker, Preview); only the page structure differs.
 * Never used by real pages.
 */

export const ND_STATES = ["empty", "uploading", "ready", "limit", "error", "short"] as const;
export type NdPreview = (typeof ND_STATES)[number];
export const ND_IDS = ["one-card", "receipt", "two-steps", "price-on-selection"] as const;
export type NdId = (typeof ND_IDS)[number];
const LETTER: Record<NdId, string> = { "one-card": "A", receipt: "B", "two-steps": "C", "price-on-selection": "D" };
export type ErrorReason = "length" | "size" | "type";

export const DURATION = 252; // the demo video: 4:12
export const MAX = 120; // the longest section (brief §3)
const SIZE_MB = 38;
const RANGE_READY: [number, number] = [30, 102]; // 72 s → 72 credits
const RANGE_LIMIT: [number, number] = [70, 190]; // exactly 120 s
const OK_TYPES = /\.(mp4|mov|webm)$/i;

export type NewDub = ReturnType<typeof useNewDub>;

/** Demo-only state: upload (a fake clock), the section, the balance, a fake section player and the start action. */
function useNewDub(preview: NdPreview, reason: ErrorReason) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const phaseOf = (p: NdPreview) => (p === "empty" ? "empty" : p === "uploading" ? "uploading" : p === "error" ? "error" : "ready");
  const [phase, setPhase] = useState<"empty" | "uploading" | "ready" | "error">(phaseOf(preview));
  const [error, setError] = useState<ErrorReason>(reason);
  const [progress, setProgress] = useState(preview === "uploading" ? 64 : 0);
  const [live, setLive] = useState(false); // a ?state=uploading preview is frozen; choosing a file runs the clock
  const [fileName, setFileName] = useState<string>(t("concepts.newDub.fileName"));
  const [range, setRangeState] = useState<[number, number]>(preview === "limit" ? RANGE_LIMIT : preview === "uploading" ? [0, Math.min(DURATION, MAX)] : RANGE_READY);
  const [balance] = useState(preview === "short" ? 40 : 120);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(range[0]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (phase !== "uploading" || !live) return;
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return p;
        const n = Math.min(100, p + 5);
        if (n === 100) window.setTimeout(() => setPhase("ready"), 250);
        return n;
      });
    }, 80);
    return () => window.clearInterval(id);
  }, [phase, live]);

  useEffect(() => {
    if (!playing) return;
    const started = performance.now();
    const from = pos;
    const id = window.setInterval(() => {
      const p = from + (performance.now() - started) / 1000;
      if (p >= range[1]) {
        setPlaying(false);
        setPos(range[0]);
      } else setPos(p);
    }, 100);
    return () => window.clearInterval(id);
    // the clock restarts only when play is toggled
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const len = range[1] - range[0];
  const cost = creditsFor(len);
  return {
    phase, error, progress, fileName, range, len, cost, balance, playing, pos, starting,
    duration: DURATION,
    sizeMb: SIZE_MB,
    short: cost > balance,
    missing: Math.max(0, cost - balance),
    left: balance - cost,
    atMax: len >= MAX - 0.05,
    /** the longest section the balance pays for (D: "Shorten to …") */
    affordable: Math.max(1, balance),
    choose: (file?: File) => {
      setPlaying(false);
      if (file && !OK_TYPES.test(file.name)) return void (setError("type"), setPhase("error"));
      if (file && file.size > 250 * 1024 * 1024) return void (setError("size"), setPhase("error"));
      setFileName(file?.name ?? t("concepts.newDub.fileName"));
      setRangeState([0, Math.min(DURATION, MAX)]); // default: the whole video if ≤ 120 s, else the first 120 s
      setPos(0);
      setProgress(0);
      setLive(true);
      setPhase("uploading");
    },
    reset: () => {
      setPlaying(false);
      setLive(false);
      setProgress(0);
      setPhase("empty");
    },
    setRange: (a: number, b: number) => {
      setPlaying(false);
      setRangeState([a, b]);
      setPos(a);
    },
    togglePlay: () => setPlaying((p) => !p),
    start: () => {
      setStarting(true);
      window.setTimeout(() => {
        setStarting(false);
        toast({ tone: "success", title: t("concepts.newDub.cost.started") });
      }, 900);
    },
    buy: () => navigate("/styleguide/templates/credits"),
  };
}

/** The OS file dialog (the only native picker allowed) behind a hidden input. */
function useFilePicker(onFile: (f: File) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={ref}
      type="file"
      accept="video/mp4,video/quicktime,video/webm"
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      data-testid="new-dub-file"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
        e.target.value = "";
      }}
    />
  );
  return { input, open: () => ref.current?.click() };
}

/*
 * Picker — empty / uploading / error in one shape (the parts swap, the box stays). Desktop says "Drop a video here",
 * touch screens say "Choose a video" (no drag and drop on phones). `tall` stretches it to the frame it stands in for.
 */
export function Picker({ nd, tall, bare }: { nd: NewDub; tall?: boolean; bare?: boolean }) {
  const { t } = useTranslation();
  const picker = useFilePicker(nd.choose);
  const [over, setOver] = useState(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f && nd.phase !== "uploading") nd.choose(f);
  };
  const uploading = nd.phase === "uploading";
  const error = nd.phase === "error";
  return (
    <div
      className={s.picker}
      data-tall={tall ? "" : undefined}
      data-bare={bare ? "" : undefined}
      data-over={over ? "" : undefined}
      data-testid="new-dub-picker"
      data-state={nd.phase}
      onDragOver={(e) => { e.preventDefault(); if (!uploading) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      {picker.input}
      <IconTile icon={error ? "error" : uploading ? "video" : "upload"} tone={error ? "danger" : "accent"} size={40} />
      {uploading ? (
        <div className={s.pickerBody} data-wide="">
          <Text medium tone="strong">{nd.fileName}</Text>
          <ProgressBar label={t("concepts.newDub.pick.uploading")} value={nd.progress} />
          <div><Button variant="ghost" onClick={nd.reset}>{t("concepts.newDub.pick.cancel")}</Button></div>
        </div>
      ) : (
        <div className={s.pickerBody}>
          <h2 className={s.pickerTitle}>
            {error ? t("concepts.newDub.pick.errorTitle") : (
              <>
                <span className={s.pointerFine}>{t("concepts.newDub.pick.drop")}</span>
                <span className={s.pointerCoarse}>{t("concepts.newDub.pick.phone")}</span>
              </>
            )}
          </h2>
          <Text tone={error ? "danger" : "text"}>
            {error ? t(`concepts.newDub.pick.errors.${nd.error}`) : t("concepts.newDub.pick.hint")}
          </Text>
          {error && <Text size="sm" tone="muted">{t("concepts.newDub.pick.hint")}</Text>}
          <div className={s.pickerAction}>
            <Button size="lg" icon={<Icon name="upload" />} onClick={picker.open}>
              {error ? t("concepts.newDub.pick.another") : t("concepts.newDub.pick.choose")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** A small "Replace video" action that opens the OS dialog directly. */
export function ReplaceButton({ nd, variant = "ghost" }: { nd: NewDub; variant?: "ghost" | "secondary" }) {
  const { t } = useTranslation();
  const picker = useFilePicker(nd.choose);
  return (
    <>
      {picker.input}
      <Button variant={variant} icon={<Icon name="refresh" />} onClick={picker.open}>{t("concepts.newDub.replace")}</Button>
    </>
  );
}

/** The video (grey box, low-fi) + "Play section". maxHeight is each concept's budget. */
export function Preview({ nd, maxHeight, meta }: { nd: NewDub; maxHeight: string; meta?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Stack gap={8}>
      <VideoStage label={t("concepts.newDub.video")} ratio={16 / 9} maxHeight={maxHeight}>
        <span className={s.videoLabel} aria-hidden="true">
          {nd.playing ? t("concepts.newDub.playing", { time: formatTime(nd.pos) }) : t("concepts.newDub.videoBox", { len: formatTime(nd.duration) })}
        </span>
      </VideoStage>
      <Cluster gap={12} justify="between">
        <Button variant="secondary" size="lg" icon={<Icon name={nd.playing ? "pause" : "play"} />} aria-pressed={nd.playing} onClick={nd.togglePlay}>
          {nd.playing ? t("concepts.newDub.pause") : t("concepts.newDub.playSection")}
        </Button>
        {meta}
      </Cluster>
    </Stack>
  );
}

/** "That's the longest section — 2 minutes." — shown only when the section is at 120 s. */
export function LimitHint({ nd }: { nd: NewDub }) {
  const { t } = useTranslation();
  if (!nd.atMax) return null;
  return (
    <p className={s.limit} role="status">
      <Icon name="info" size={14} />
      {t("concepts.newDub.limit")}
    </p>
  );
}

/** "Start dubbing · 72 credits" — the one deliberate action. */
export function StartButton({ nd, full }: { nd: NewDub; full?: boolean }) {
  const { t } = useTranslation();
  return (
    <Button
      size="lg"
      className={full ? s.fullButton : undefined}
      icon={<Icon name="credits" />}
      onClick={nd.start}
      loading={nd.starting}
      disabled={nd.short}
      data-testid="new-dub-start"
    >
      {`${t("concepts.newDub.cost.start")} · ${t("concepts.newDub.cost.credits", { count: nd.cost })}`}
    </Button>
  );
}

export function BuyButton({ nd, variant = "primary", full }: { nd: NewDub; variant?: "primary" | "secondary"; full?: boolean }) {
  const { t } = useTranslation();
  return (
    <Button variant={variant} size="lg" className={full ? s.fullButton : undefined} icon={<Icon name="purchase" />} onClick={nd.buy}>
      {t("concepts.newDub.cost.buy")}
    </Button>
  );
}

/*
 * NewDubPage — the ordinary shell (nav "My projects · New dub") + the concept + the note card with the idea, trade-offs
 * and a state picker. Remounts on every state so the demo seeds from the state it opens in.
 */
export function NewDubPage({
  id, hideCredits, children,
}: { id: NdId; hideCredits?: boolean; children: (nd: NewDub) => ReactNode }) {
  const preview = useViewState(ND_STATES);
  const [params] = useSearchParams();
  const r = params.get("reason");
  const reason: ErrorReason = r === "size" || r === "type" ? r : "length";
  return <Body key={`${preview}-${reason}`} id={id} preview={preview} reason={reason} hideCredits={hideCredits}>{children}</Body>;
}

function Body({
  id, preview, reason, hideCredits, children,
}: { id: NdId; preview: NdPreview; reason: ErrorReason; hideCredits?: boolean; children: (nd: NewDub) => ReactNode }) {
  const { t } = useTranslation();
  const nd = useNewDub(preview, reason);
  return (
    <AppShell
      credits={nd.balance}
      hideCredits={hideCredits}
      user={{ name: "Alex Morgan", email: "alex@example.com" }}
      links={{ home: "/styleguide/templates/projects", credits: "/styleguide/templates/credits", settings: "/styleguide/templates/settings" }}
      onSignOut={() => toast({ tone: "info", title: t("tpl.common.signedOut") })}
      nav={[
        { to: "/styleguide/templates/projects", label: t("tpl.nav.projects"), icon: "projects" },
        { to: `/prototypes/concepts/new-dub/${id}`, label: t("tpl.nav.newDub"), icon: "add" },
      ]}
    >
      <div data-concept={id} data-testid="new-dub">{children(nd)}</div>
      <div className={s.noteWrap}>
        <Note id={id} preview={preview} />
      </div>
    </AppShell>
  );
}

function Note({ id, preview }: { id: NdId; preview: NdPreview }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const rows = ["laptop", "phone", "money", "effort", "build"] as const;
  return (
    <Card padding="none" data-testid="concept-note">
      <CardHeader title={t("concepts.newDub.note.title", { letter: LETTER[id], name: t(`concepts.newDub.c.${id}.name`) })} />
      <CardBody>
        <Stack gap={12}>
          <Text tone="strong" medium>{t(`concepts.newDub.c.${id}.idea`)}</Text>
          <dl className={s.tradeoffs}>
            {rows.map((r) => (
              <div key={r} className={s.tradeoff}>
                <dt>{t(`concepts.newDub.note.${r}`)}</dt>
                <dd>{t(`concepts.newDub.c.${id}.${r}`)}</dd>
              </div>
            ))}
          </dl>
          <Text size="sm" tone="muted">{t("concepts.newDub.note.fixed")}</Text>
          <div className={s.statePicker}>
            <Select<NdPreview>
              label={t("concepts.newDub.note.state")}
              value={preview}
              onChange={(v) => {
                const next = new URLSearchParams(params);
                if (v === "empty") next.delete("state");
                else next.set("state", v);
                setParams(next, { replace: true });
              }}
              options={ND_STATES.map((v) => ({ value: v, label: t(`concepts.newDub.note.states.${v}`) }))}
            />
          </div>
        </Stack>
      </CardBody>
      <CardFooter>
        <div className={s.others}>
          <Text size="sm" tone="muted">{t("concepts.newDub.note.others")}</Text>
          {ND_IDS.filter((c) => c !== id).map((c) => (
            <TextLink key={c} to={`/prototypes/concepts/new-dub/${c}${preview === "empty" ? "" : `?state=${preview}`}`}>
              {`${LETTER[c]} · ${t(`concepts.newDub.c.${c}.name`)}`}
            </TextLink>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
