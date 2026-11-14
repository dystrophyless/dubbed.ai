import { useTranslation } from "react-i18next";
import { Icon, ICONS, type IconName } from "@/components/icons";
import { Text } from "@/components/ui";
import { SgSection, Specimen } from "../Specimen";
import s from "../sg.module.css";

const COLORS = [
  "canvas", "surface", "strong", "ink", "text", "muted", "icon", "faint", "line", "fill-strong", "track", "wash",
  "solid", "accent", "accent-soft", "focus", "danger", "danger-soft", "success", "success-soft", "warning", "warning-soft",
] as const;

const TYPE = [
  ["display", "28 / 36 · 500 · D"],
  ["h1", "22 / 30 · 500 · D"],
  ["h2", "18 / 26 · 500 · D"],
  ["lg", "15 / 24 · 500"],
  ["md", "13 / 20 · 400 / 500"],
  ["sm", "12 / 16"],
  ["sm2", "11 / 16"],
  ["xs", "10 / 16 · caps"],
] as const;

const RADII = [["xs", 2], ["sm", 4], ["chip", 5], ["control", 6], ["segment", 8], ["card", 10]] as const;
const SHADOWS = ["card", "card-hover", "pop", "field", "focus"] as const;
const SPACE = [2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 48, 64] as const;

export function Foundations() {
  const { t } = useTranslation();
  return (
    <SgSection id="foundations" title={t("sg.foundations.title")} description={t("sg.foundations.description")}>
      <Specimen title={t("sg.foundations.colors")} wide note={t("sg.foundations.colorsNote")}>
        <div className={s.swatches}>
          {COLORS.map((c) => (
            <div key={c} className={s.swatch}>
              <span className={s.chip} style={{ background: `var(--color-${c})` }} />
              <span style={{ minWidth: 0 }}>
                <div className={s.swatchName}>{c}</div>
                <div className={s.swatchValue}>--color-{c}</div>
              </span>
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen title={t("sg.foundations.type")} wide note={t("sg.foundations.typeNote")}>
        {TYPE.map(([k, meta]) => (
          <div key={k} className={s.typeRow}>
            <span className={s.swatchValue}>{meta}</span>
            <span
              style={{
                fontSize: `var(--text-${k})`,
                lineHeight: `var(--leading-${k})`,
                letterSpacing: k === "xs" ? "var(--tracking-overline)" : ["display", "h1", "h2"].includes(k) ? `var(--tracking-${k})` : undefined,
                fontWeight: k === "md" || k === "sm" || k === "sm2" ? "var(--weight-regular)" : "var(--weight-medium)",
                textTransform: k === "xs" ? "uppercase" : undefined,
                color: "var(--color-strong)",
              }}
            >
              {t("sg.foundations.pangram")}
            </span>
          </div>
        ))}
      </Specimen>
      <Specimen title={t("sg.foundations.radii")}>
        <div className={s.boxes}>
          {RADII.map(([k, v]) => (
            <div key={k} className={s.box} style={{ borderRadius: `var(--radius-${k})`, width: 64, height: 48 }}>{k}<br />{v}px</div>
          ))}
        </div>
      </Specimen>
      <Specimen title={t("sg.foundations.shadows")}>
        <div className={s.boxes}>
          {SHADOWS.map((k) => (
            <div key={k} className={s.box} style={{ borderRadius: "var(--radius-card)", boxShadow: `var(--shadow-${k})` }}>{k}</div>
          ))}
        </div>
      </Specimen>
      <Specimen title={t("sg.foundations.spacing")}>
        {SPACE.map((v) => (
          <div key={v} className={s.typeRow} style={{ gridTemplateColumns: "40px 1fr", paddingBlock: 0 }}>
            <span className={s.swatchValue}>{v}</span>
            <span className={s.spaceBar} style={{ width: v * 3 }} />
          </div>
        ))}
      </Specimen>
      <Specimen title={t("sg.foundations.motion")} note={t("sg.foundations.motionNote")}>
        <Text tone="text">{t("sg.foundations.motionText")}</Text>
      </Specimen>
      <Specimen title={t("sg.foundations.icons")} wide note={t("sg.foundations.iconsNote")}>
        <div className={s.icons}>
          {(Object.keys(ICONS) as IconName[]).map((n) => (
            <div key={n} className={s.iconCell}>
              <Icon name={n} />
              <span>{n}</span>
            </div>
          ))}
        </div>
      </Specimen>
    </SgSection>
  );
}
