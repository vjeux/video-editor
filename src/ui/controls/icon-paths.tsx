import type { ReactNode } from "react";

const stroke = (children: ReactNode) => ({ fill: "none", stroke: "currentColor", children });
const solid = (children: ReactNode) => ({ fill: "currentColor", stroke: "none", children });

export const ICONS = {
  play: solid(<path d="M7 4l13 8-13 8z" />),
  pause: solid(<path d="M6 4h4v16H6zM14 4h4v16h-4z" />),
  start: solid(<path d="M6 5h2v14H6zM20 5v14L9 12z" />),
  end: solid(<path d="M16 5h2v14h-2zM4 5v14l11-7z" />),
  prev: solid(<path d="M17 5v14l-9-7z" />),
  next: solid(<path d="M7 5v14l9-7z" />),
  loop: stroke(
    <>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4" />
      <path d="M21 13v2a3 3 0 01-3 3H3" />
    </>,
  ),
  volume: stroke(<path d="M11 5L6 9H3v6h3l5 4zM16 9a4 4 0 010 6" />),
  mute: stroke(<path d="M11 5L6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6" />),
  fullscreen: stroke(<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />),
  undo: stroke(
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h11a5 5 0 010 10h-3" />
    </>,
  ),
  redo: stroke(
    <>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H9a5 5 0 000 10h3" />
    </>,
  ),
  export: stroke(<path d="M12 3v12M7 10l5 5 5-5M5 21h14" />),
  folder: stroke(<path d="M3 7h6l2 2h10v10H3z" />),
  search: stroke(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>,
  ),
  pointer: solid(<path d="M5 3l14 8-6 2-3 6z" />),
  blade: stroke(
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" />
    </>,
  ),
  split: stroke(<path d="M12 3v18M8 7l-4 5 4 5M16 7l4 5-4 5" />),
  text: stroke(<path d="M5 6V4h14v2M12 4v16M9 20h6" />),
  magnet: stroke(<path d="M6 3v8a6 6 0 0012 0V3M6 7h4M14 7h4" />),
  ripple: stroke(<path d="M3 12h4l3-6 4 12 3-6h4" />),
  marker: stroke(<path d="M12 3l6 6-6 12-6-12z" />),
  trash: stroke(<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3" />),
  zoomOut: stroke(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M8 11h6" />
    </>,
  ),
  zoomIn: stroke(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M8 11h6M11 8v6" />
    </>,
  ),
  fit: stroke(<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" />),
  safe: stroke(
    <>
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <rect x="7" y="8" width="10" height="8" strokeDasharray="2 2" />
    </>,
  ),
  eye: stroke(
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>,
  ),
  eyeOff: stroke(
    <path d="M3 3l18 18M10.6 5.1A10 10 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 3.9M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 005.4-1.6" />,
  ),
  lock: stroke(
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </>,
  ),
  unlock: stroke(
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 017.5-2" />
    </>,
  ),
  close: stroke(<path d="M6 6l12 12M18 6L6 18" />),
  panelLeft: stroke(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>,
  ),
  panelRight: stroke(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </>,
  ),
  check: stroke(<path d="M5 12l5 5 9-10" />),
  plus: stroke(<path d="M12 5v14M5 12h14" />),
  film: stroke(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </>,
  ),
  music: stroke(
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>,
  ),
  image: stroke(
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </>,
  ),
  code: stroke(<path d="M8 6l-6 6 6 6M16 6l6 6-6 6" />),
  upload: stroke(<path d="M12 21V9M7 14l5-5 5 5M5 3h14" />),
  alignLeft: stroke(<path d="M4 6h16M4 10h10M4 14h16M4 18h10" />),
  alignCenter: stroke(<path d="M4 6h16M7 10h10M4 14h16M7 18h10" />),
  alignRight: stroke(<path d="M4 6h16M10 10h10M4 14h16M10 18h10" />),
  chevronDown: stroke(<path d="M6 9l6 6 6-6" />),
  chevronRight: stroke(<path d="M9 6l6 6-6 6" />),
  copy: stroke(
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" />
    </>,
  ),
  paste: stroke(
    <>
      <path d="M9 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-3" />
      <rect x="9" y="2" width="6" height="4" rx="1" />
    </>,
  ),
  duplicate: stroke(
    <>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M4 16V5a1 1 0 011-1h11M14.5 11.5v6M11.5 14.5h6" />
    </>,
  ),
  toPlayhead: stroke(<path d="M20 4v16M4 12h12M12 8l4 4-4 4" />),
  reset: stroke(
    <>
      <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </>,
  ),
  transition: stroke(
    <>
      <rect x="2" y="6" width="12" height="12" rx="2" />
      <path d="M18 6h2a2 2 0 012 2v8a2 2 0 01-2 2h-2" strokeDasharray="2.5 2.5" />
    </>,
  ),
  layers: stroke(<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" />),
  freeze: stroke(<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11M9 4l3 2 3-2M9 20l3-2 3 2" />),
  track: stroke(<path d="M3 6h18M3 12h18M3 18h18" />),
} as const;

export type IconName = keyof typeof ICONS;

export const isIconName = (name: string): name is IconName => Object.hasOwn(ICONS, name);
