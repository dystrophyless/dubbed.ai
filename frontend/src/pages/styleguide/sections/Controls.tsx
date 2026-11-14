import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Stack } from "@/components/layout";
import {
  Button, Checkbox, OtpInput, PasswordField, RadioGroup, SegmentedControl, Select, Switch, TextArea, TextField, type OtpStatus,
} from "@/components/ui";
import { Row, SgSection, Specimen } from "../Specimen";

export function Buttons() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <SgSection id="buttons" title={t("sg.buttons.title")} description={t("sg.buttons.description")}>
      <Specimen title={t("sg.buttons.variants")} wide note={t("sg.buttons.variantsNote")}>
        <Row>
          <Button>{t("sg.buttons.save")}</Button>
          <Button variant="secondary">{t("sg.buttons.cancel")}</Button>
          <Button variant="ghost">{t("sg.buttons.skip")}</Button>
          <Button variant="destructive" icon={<Icon name="delete" />}>{t("sg.buttons.delete")}</Button>
        </Row>
      </Specimen>
      <Specimen title={t("sg.buttons.sizes")} wide note={t("sg.buttons.sizesNote")}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <Row key={size} label={size}>
            <Button size={size}>{t("sg.buttons.save")}</Button>
            <Button size={size} variant="secondary" icon={<Icon name="add" size={size === "sm" ? 14 : 16} />}>{t("sg.buttons.add")}</Button>
            <Button size={size} variant="ghost">{t("sg.buttons.skip")}</Button>
            <Button size={size} variant="destructive">{t("sg.buttons.delete")}</Button>
            <Button size={size} variant="secondary" icon={<Icon name="more" size={size === "sm" ? 14 : 16} />} aria-label={t("sg.buttons.more")} />
          </Row>
        ))}
      </Specimen>
      <Specimen title={t("sg.buttons.states")} note={t("sg.buttons.statesNote")}>
        <Row label={t("sg.state.loading")}>
          <Button variant="secondary" icon={<Icon name="upload" />} loading={loading} onClick={() => { setLoading(true); window.setTimeout(() => setLoading(false), 2000); }}>
            {t("sg.buttons.upload")}
          </Button>
        </Row>
        <Row label={t("sg.state.feedback")}>
          <Button variant="secondary" icon={<Icon name={copied ? "check" : "download"} />} onClick={() => { setCopied(true); window.setTimeout(() => setCopied(false), 1600); }}>
            {copied ? t("sg.buttons.done") : t("sg.buttons.download")}
          </Button>
        </Row>
        <Row label={t("sg.state.disabled")}>
          <Button disabled>{t("sg.buttons.save")}</Button>
          <Button variant="secondary" disabled>{t("sg.buttons.cancel")}</Button>
        </Row>
      </Specimen>
      <Specimen title={t("sg.buttons.icons")} note={t("sg.buttons.iconsNote")}>
        <Row>
          <Button iconRight={<Icon name="forward" />}>{t("sg.buttons.continue")}</Button>
          <Button variant="secondary" icon={<Icon name="back" />}>{t("sg.buttons.back")}</Button>
        </Row>
      </Specimen>
    </SgSection>
  );
}

export function Fields() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [bio, setBio] = useState<string>(t("sg.fields.bioValue"));
  const [lang, setLang] = useState<"en" | "ru" | "mixed" | null>("mixed");
  const [empty, setEmpty] = useState<string | null>(null);
  return (
    <SgSection id="fields" title={t("sg.fields.title")} description={t("sg.fields.description")}>
      <Specimen title={t("sg.fields.text")}>
        <Stack gap={16}>
          <TextField label={t("sg.fields.projectName")} placeholder={t("sg.fields.projectPlaceholder")} value={name} onChange={(e) => setName(e.target.value)} hint={t("sg.fields.projectHint")} />
          <TextField label={t("sg.fields.email")} type="email" defaultValue="name@" error={t("sg.fields.emailError")} icon={<Icon name="email" />} />
          <TextField label={t("sg.fields.promo")} optional placeholder="WELCOME" />
          <TextField label={t("sg.fields.disabled")} defaultValue={t("sg.fields.disabledValue")} disabled />
        </Stack>
      </Specimen>
      <Specimen title={t("sg.fields.password")}>
        <Stack gap={16}>
          <PasswordField label={t("sg.fields.password")} defaultValue="correct horse" hint={t("sg.fields.passwordHint")} autoComplete="new-password" />
          <PasswordField label={t("sg.fields.passwordRepeat")} defaultValue="correct hors" error={t("sg.fields.passwordError")} autoComplete="new-password" />
        </Stack>
      </Specimen>
      <Specimen title={t("sg.fields.textarea")}>
        <TextArea label={t("sg.fields.feedback")} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} hint={t("sg.fields.feedbackHint")} />
      </Specimen>
      <Specimen title={t("sg.fields.select")} note={t("sg.fields.selectNote")}>
        <Stack gap={16}>
          <Select
            label={t("sg.fields.speech")}
            value={lang}
            onChange={setLang}
            options={[
              { value: "en", label: t("sg.fields.speechEn") },
              { value: "ru", label: t("sg.fields.speechRu") },
              { value: "mixed", label: t("sg.fields.speechMixed") },
            ]}
          />
          <Select
            label={t("sg.fields.sort")}
            value={empty}
            onChange={setEmpty}
            placeholder={t("sg.fields.sortPlaceholder")}
            error={empty ? undefined : t("sg.fields.sortError")}
            options={[
              { value: "recent", label: t("sg.fields.sortRecent"), icon: <Icon name="history" /> },
              { value: "name", label: t("sg.fields.sortName"), icon: <Icon name="edit" /> },
              { value: "progress", label: t("sg.fields.sortProgress"), icon: <Icon name="success" />, disabled: true },
            ]}
          />
          <Select label={t("sg.fields.disabled")} value="a" onChange={() => {}} disabled options={[{ value: "a", label: t("sg.fields.disabledValue") }]} />
        </Stack>
      </Specimen>
    </SgSection>
  );
}

export function Choices() {
  const { t } = useTranslation();
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const [sw, setSw] = useState(true);
  const [q, setQ] = useState<"720" | "480">("720");
  const [seg1, setSeg1] = useState("all");
  const [seg2, setSeg2] = useState("list");
  const [seg3, setSeg3] = useState("packs");
  return (
    <SgSection id="choices" title={t("sg.choices.title")} description={t("sg.choices.description")}>
      <Specimen title={t("sg.choices.checkbox")}>
        <Stack gap={2}>
          <Checkbox label={t("sg.choices.terms")} checked={a} onChange={(e) => setA(e.target.checked)} />
          <Checkbox label={t("sg.choices.news")} description={t("sg.choices.newsHint")} checked={b} onChange={(e) => setB(e.target.checked)} />
          <Checkbox label={t("sg.choices.some")} indeterminate readOnly />
          <Checkbox label={t("sg.fields.disabled")} disabled />
        </Stack>
      </Specimen>
      <Specimen title={t("sg.choices.radio")}>
        <RadioGroup
          legend={t("sg.choices.quality")}
          value={q}
          onChange={setQ}
          options={[
            { value: "720", label: "720p", description: t("sg.choices.q720") },
            { value: "480", label: "480p", description: t("sg.choices.q480") },
          ]}
        />
      </Specimen>
      <Specimen title={t("sg.choices.switch")}>
        <Stack gap={2}>
          <Switch label={t("sg.choices.original")} description={t("sg.choices.originalHint")} checked={sw} onChange={(e) => setSw(e.target.checked)} />
          <Switch label={t("sg.fields.disabled")} disabled />
        </Stack>
      </Specimen>
      <Specimen title={t("sg.choices.segmented")} wide note={t("sg.choices.segmentedNote")}>
        <Row label="buttons">
          <SegmentedControl aria-label={t("sg.choices.filter")} value={seg1} onChange={setSeg1} options={[
            { value: "all", label: t("sg.choices.all"), count: 4 },
            { value: "progress", label: t("sg.choices.inProgress"), count: 3 },
            { value: "done", label: t("sg.choices.done"), count: 1 },
          ]} />
        </Row>
        <Row label="tray">
          <SegmentedControl aria-label={t("sg.choices.view")} variant="tray" value={seg2} onChange={setSeg2} options={[
            { value: "list", label: t("sg.choices.list"), icon: <Icon name="menu" size={14} /> },
            { value: "grid", label: t("sg.choices.grid"), icon: <Icon name="projects" size={14} /> },
          ]} />
        </Row>
        <Row label="underline">
          <SegmentedControl aria-label={t("sg.choices.creditsTabs")} variant="underline" value={seg3} onChange={setSeg3} options={[
            { value: "packs", label: t("sg.choices.packs") },
            { value: "history", label: t("sg.choices.history") },
          ]} />
        </Row>
      </Specimen>
    </SgSection>
  );
}

export function Otp() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<OtpStatus>("idle");
  return (
    <SgSection id="otp" title={t("sg.otp.title")} description={t("sg.otp.description")}>
      <Specimen title={t("sg.otp.live")} note={t("sg.otp.liveNote")}>
        <OtpInput
          length={6}
          separator
          status={status}
          onChange={() => status === "error" && setStatus("idle")}
          onComplete={(code) => {
            setStatus("verifying");
            window.setTimeout(() => setStatus(code === "482913" ? "success" : "error"), 1200);
          }}
          errorMessage={t("sg.otp.error")}
          successLabel={t("sg.otp.verified")}
          onResend={() => {}}
          label={t("sg.otp.label")}
        />
      </Specimen>
      <Specimen title={t("sg.state.loading")}>
        <OtpInput length={6} separator status="verifying" defaultValue="482913" label={t("sg.otp.label")} />
      </Specimen>
      <Specimen title={t("sg.state.disabled")}>
        <OtpInput length={6} separator disabled label={t("sg.otp.label")} />
      </Specimen>
    </SgSection>
  );
}
