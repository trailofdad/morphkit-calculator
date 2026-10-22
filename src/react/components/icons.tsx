import type { ReactNode } from 'react';

/**
 * Stroke icons drawn on a 24px grid and sized to the surrounding text
 * (`1em`), using `currentColor`. SVG rather than text glyphs: "×" and "⇄" sit
 * on the font's baseline, so they never centre exactly in a button.
 */
function Icon({ children }: { children: ReactNode }): ReactNode {
  return (
    <svg
      className="mkc-icon"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function CloseIcon(): ReactNode {
  return (
    <Icon>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  );
}

export function SwapIcon(): ReactNode {
  return (
    <Icon>
      <path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" />
    </Icon>
  );
}
