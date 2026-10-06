export type IconName =
  | "album"
  | "upload"
  | "magic"
  | "template"
  | "save"
  | "render"
  | "music"
  | "image"
  | "layers"
  | "sliders"
  | "play"
  | "previous"
  | "next"
  | "volume"
  | "gemini"
  | "key"
  | "settings"
  | "send"
  | "timeline";

export function AppIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "album":
      return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 8h8M8 12h6" /><circle cx="15.5" cy="16.5" r="1.5" /></svg>;
    case "upload":
      return <svg {...common}><path d="M12 16V5" /><path d="m8 9 4-4 4 4" /><path d="M5 15v4h14v-4" /></svg>;
    case "magic":
      return <svg {...common}><path d="m4 20 11-11" /><path d="m13 5 2-2 6 6-2 2" /><path d="M5 4v3M3.5 5.5h3M17 16v4M15 18h4" /></svg>;
    case "template":
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></svg>;
    case "save":
      return <svg {...common}><path d="M5 3h12l2 2v16H5z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></svg>;
    case "render":
      return <svg {...common}><path d="M12 3v12" /><path d="m8 11 4 4 4-4" /><path d="M5 19h14" /></svg>;
    case "music":
      return <svg {...common}><path d="M9 18V6l10-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></svg>;
    case "image":
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m5 18 5-5 3 3 2-2 4 4" /></svg>;
    case "layers":
      return <svg {...common}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></svg>;
    case "sliders":
      return <svg {...common}><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4" /><circle cx="16" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="14" cy="18" r="2" /></svg>;
    case "play":
      return <svg {...common}><path d="m9 7 8 5-8 5z" /></svg>;
    case "previous":
      return <svg {...common}><path d="M7 6v12M18 7l-8 5 8 5z" /></svg>;
    case "next":
      return <svg {...common}><path d="M17 6v12M6 7l8 5-8 5z" /></svg>;
    case "volume":
      return <svg {...common}><path d="M5 10v4h4l5 4V6L9 10z" /><path d="M17 9c1.2 1.5 1.2 4.5 0 6" /></svg>;
    case "gemini":
      return <svg {...common}><path d="M12 2c.8 5.3 4.1 8.6 9 10-4.9 1.4-8.2 4.7-9 10-.8-5.3-4.1-8.6-9-10 4.9-1.4 8.2-4.7 9-10Z" /></svg>;
    case "key":
      return <svg {...common}><circle cx="8" cy="12" r="4" /><path d="M12 12h9M18 12v3M15 12v2" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.4 3a8 8 0 0 0-1.7 1L5 6.1 3 9.5 5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 3h5l.4-3a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" /></svg>;
    case "send":
      return <svg {...common}><path d="m4 4 17 8-17 8 3-8z" /><path d="M7 12h14" /></svg>;
    case "timeline":
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /><path d="M8 5v4M15 10v4M11 15v4" /></svg>;
  }
}
