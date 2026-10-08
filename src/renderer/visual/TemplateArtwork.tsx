import { memo, useId } from "react";

export type TemplateArtworkStyle =
  | "sunset"
  | "mountain"
  | "neon"
  | "vinyl"
  | "night"
  | "seaside"
  | "studio"
  | "retro";

function artworkStyle(
  templateId: string,
  category: string,
): TemplateArtworkStyle {
  const id = templateId.toLowerCase();
  if (id.includes("neon") || category === "Neon") return "neon";
  if (id.includes("retro") || category === "Retro") return "retro";
  if (id.includes("classic") || category === "Classic") return "vinyl";
  if (id.includes("ambient") || category === "Ambient") return "seaside";
  if (id.includes("dark") || category === "Dark") return "night";
  if (id.includes("motion") || category === "Motion") return "studio";
  if (id.includes("light") || id.includes("gunung") || category === "Light")
    return "mountain";
  return "sunset";
}

interface TemplateArtworkProps {
  templateId: string;
  category: string;
  className?: string;
}

/**
 * Locally authored illustration for the TEMPLATE PICKER only.
 * This is NOT user artwork, an external image, a media decoder or a preview
 * of actual output footage. It is deliberately absent from the project schema.
 */
export const TemplateArtwork = memo(function TemplateArtwork({
  templateId,
  category,
  className = "",
}: TemplateArtworkProps) {
  const uid = useId().replace(/:/g, "");
  const sky = `template-sky-${uid}`;
  const water = `template-water-${uid}`;
  const sun = `template-sun-${uid}`;
  const style = artworkStyle(templateId, category);
  const city = style === "sunset" || style === "night" || style === "retro";
  const coastal = style === "seaside" || style === "mountain";
  const electric = style === "neon" || style === "studio";
  const dark = style === "night" || style === "neon" || style === "studio";
  const colors = {
    sunset: ["#456eae", "#eda88d", "#fcd694", "#253c66", "#314a71"],
    mountain: ["#a2c5db", "#f4c8bd", "#fef0d3", "#7699ae", "#456b82"],
    neon: ["#10153b", "#592d87", "#ee5992", "#151942", "#0b234b"],
    vinyl: ["#2a1b23", "#c68c57", "#f8d8a0", "#402e40", "#171521"],
    night: ["#0c1730", "#334374", "#b3a1c7", "#243350", "#0d1831"],
    seaside: ["#719bb7", "#e8b6a9", "#fae5b0", "#668da1", "#234b67"],
    studio: ["#15183c", "#3c489b", "#e5a1a1", "#242850", "#11142d"],
    retro: ["#62375d", "#e68e81", "#ffd1a4", "#69406a", "#2c2a54"],
  }[style];
  return (
    <svg
      className={className}
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Ilustrasi contoh template, bukan artwork asli"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={sky} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="57%" stopColor={colors[1]} />
          <stop offset="100%" stopColor={colors[2]} />
        </linearGradient>
        <linearGradient id={water} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors[3]} />
          <stop offset="100%" stopColor={colors[4]} />
        </linearGradient>
        <radialGradient id={sun}>
          <stop offset="0%" stopColor={colors[2]} stopOpacity=".95" />
          <stop offset="100%" stopColor={colors[2]} stopOpacity=".05" />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${sky})`} />
      <circle cx="204" cy="77" r="78" fill={`url(#${sun})`} opacity=".58" />
      <circle
        cx="204"
        cy="72"
        r={dark ? "31" : "38"}
        fill={colors[2]}
        opacity={dark ? ".82" : ".95"}
      />
      <path
        d="M0 101 Q64 92 132 102 T320 97 L320 180 H0Z"
        fill={colors[3]}
        opacity=".28"
      />
      {city ? (
        <>
          <g fill={colors[3]}>
            <path d="M0 110 H17 V79 H31 V104 H42 V88 H59 V112 H70 V70 H82 V99 H94 V82 H107 V106 H118 V94 H136 V114 H148 V88 H160 V111 H174 V75 H191 V108 H204 V84 H218 V107 H230 V95 H246 V76 H257 V113 H270 V97 H282 V81 H297 V102 H320 V180 H0Z" />
            <path
              d="M50 72 V43 M76 70 V34 M183 75 V48 M249 75 V42"
              stroke={colors[3]}
              strokeWidth="1.5"
            />
          </g>
          <g fill="#ffd8a1" opacity=".72">
            {Array.from({ length: 18 }, (_, i) => (
              <rect
                key={i}
                x={12 + i * 17}
                y={101 + (i % 3) * 5}
                width="2.2"
                height="3.5"
              />
            ))}
          </g>
        </>
      ) : null}
      {coastal ? (
        <>
          <path
            d="M0 117 L40 86 L67 108 L128 58 L178 119 L219 81 L270 120 L297 93 L320 116 V180 H0Z"
            fill={colors[3]}
          />
          <path
            d="M0 135 L73 91 L128 127 L178 100 L239 138 L296 102 L320 117 V180 H0Z"
            fill={colors[4]}
            opacity=".9"
          />
          <path
            d="M109 80 L128 58 L152 89 L136 82 L128 87 L122 78Z"
            fill="#f7f0e9"
            opacity=".64"
          />
        </>
      ) : null}
      {style === "vinyl" ? (
        <>
          <circle
            cx="94"
            cy="116"
            r="52"
            fill="#131820"
            stroke="#e0b77a"
            strokeWidth="2"
          />
          {[45, 37, 29, 22].map((radius) => (
            <circle
              key={radius}
              cx="94"
              cy="116"
              r={radius}
              fill="none"
              stroke="#dec28f"
              strokeWidth=".7"
              opacity=".45"
            />
          ))}
          <circle cx="94" cy="116" r="13" fill="#e7b87e" />
          <circle cx="94" cy="116" r="2.8" fill="#1d1e22" />
          <path
            d="M154 68 L199 93 L181 101 L160 91Z"
            fill="#faf2e8"
            opacity=".72"
          />
        </>
      ) : null}
      {electric ? (
        <>
          <circle
            cx="154"
            cy="91"
            r="61"
            fill="none"
            stroke="#7fe6ff"
            strokeWidth="6"
            opacity=".8"
          />
          <circle
            cx="154"
            cy="91"
            r="42"
            fill="none"
            stroke="#f8a6e5"
            strokeWidth="3"
            opacity=".8"
          />
          <circle
            cx="154"
            cy="91"
            r="25"
            fill="none"
            stroke="#d5f6ff"
            strokeWidth="1.5"
            opacity=".65"
          />
          <path
            d="M0 132 H320 M0 144 H320 M0 157 H320"
            stroke="#9b76ee"
            strokeWidth="1.5"
            opacity=".55"
          />
          {Array.from({ length: 16 }, (_, i) => (
            <path
              key={i}
              d={`M${i * 21} 140 L154 96`}
              stroke="#b6a1fa"
              strokeWidth=".8"
              opacity=".25"
            />
          ))}
        </>
      ) : null}
      <rect
        x="0"
        y="119"
        width="320"
        height="61"
        fill={`url(#${water})`}
        opacity={electric || style === "vinyl" ? ".22" : ".78"}
      />
      {Array.from({ length: 20 }, (_, i) => {
        const y = 122 + i * 2.8;
        const spread = 15 + (i % 5) * 9 + i * 2.4;
        return (
          <path
            key={i}
            d={`M${204 - spread} ${y} h${spread * 2}`}
            stroke={i % 4 === 0 ? "#fff2d1" : colors[2]}
            strokeWidth={i % 3 === 0 ? 1.5 : 0.6}
            opacity={city || coastal ? 0.15 + (i % 4) * 0.08 : 0.06}
          />
        );
      })}
      <rect
        x="0"
        y="0"
        width="320"
        height="180"
        fill="none"
        stroke="#f5f7fc"
        strokeWidth="1"
        opacity=".15"
      />
    </svg>
  );
});
