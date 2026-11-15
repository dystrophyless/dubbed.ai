import type { ReactNode } from "react";
import { Heading, Text } from "@/components/ui";
import { cx } from "@/components/ui/kit/cx";
import s from "./sg.module.css";

export function SgSection({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section id={id} className={s.section} data-testid={`styleguide-${id}`} aria-labelledby={`${id}-title`}>
      <div className={s.sectionHead}>
        <Heading level={2} id={`${id}-title`}>{title}</Heading>
        <Text tone="text">{description}</Text>
      </div>
      <div className={s.specimens}>{children}</div>
    </section>
  );
}

export function Specimen({ title, note, wide, plain, children }: { title: string; note?: string; wide?: boolean; plain?: boolean; children: ReactNode }) {
  return (
    <div className={cx(s.specimen, wide && s.wide, plain && s.specimenPlain)}>
      <h3 className={s.specimenTitle}>{title}</h3>
      {children}
      {note && <p className={s.specimenNote}>{note}</p>}
    </div>
  );
}

export function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className={s.row}>
      {label && <span className={s.label}>{label}</span>}
      {children}
    </div>
  );
}
