/** Join class names, skipping falsy entries. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Per-slot class overrides for a component. Every slot always carries its
 * `mkc-*` base class (styled by the optional `styles.css`); the consumer's
 * class is appended, so Tailwind or any other CSS can restyle it.
 */
export type ClassNames<Slot extends string> = Partial<Record<Slot, string>>;
