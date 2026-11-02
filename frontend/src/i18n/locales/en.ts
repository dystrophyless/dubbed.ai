/* English — the source locale. Every key here must exist in ru.ts (enforced by the Resources type). */
export const en = {
  common: {
    appName: "Dubbed",
    language: "Language",
  },
  styleguide: {
    title: "Styleguide",
    placeholder: "The affect-ui Clean kit appears here in Phase 1.",
    templatesTitle: "Templates",
    templatesPlaceholder: "Reference page templates appear here in Phase 3.",
    templateNotFound: "Template “{{id}}” does not exist yet.",
  },
  prototypes: {
    title: "Prototypes",
    empty: "No prototypes yet. They appear here after /speckit-design runs for a feature.",
    states: "states",
  },
} as const;

type Widen<T> = { -readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Messages = Widen<typeof en>;
