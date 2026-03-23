"use client";

import { useId } from "react";

type OneLinkLogoProps = {
  iconSize?: number;
  textSize?: string;
  dark?: boolean; // true = white "One" (dark backgrounds), false = navy "One" (light backgrounds)
  className?: string;
};

export function OneLinkLogo({
  iconSize = 32,
  textSize = "text-[18px]",
  dark = false,
  className = "",
}: OneLinkLogoProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `olg-${uid}`;
  const clipId = `olc-${uid}`;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 44 44"
        fill="none"
        aria-label="OneLink logo"
        style={{ flexShrink: 0 }}
      >
        <defs>
          {/* Purple → Blue → Cyan — matches the real logo */}
          <linearGradient id={gradId} x1="0" y1="44" x2="44" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6D28D9" />
            <stop offset="42%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x="12" y="20" width="11" height="10" />
          </clipPath>
        </defs>
        {/* Back ring (bottom-right) */}
        <rect x="18" y="18" width="23" height="23" rx="8" fill="none" stroke={`url(#${gradId})`} strokeWidth="5.5" />
        {/* Front ring (top-left) */}
        <rect x="3" y="3" width="23" height="23" rx="8" fill="none" stroke={`url(#${gradId})`} strokeWidth="5.5" />
        {/* Back ring clipped — emerges in front at the crossing */}
        <rect x="18" y="18" width="23" height="23" rx="8" fill="none" stroke={`url(#${gradId})`} strokeWidth="5.5" clipPath={`url(#${clipId})`} />
      </svg>

      <span className={`${textSize} font-black tracking-tight leading-none select-none`}>
        {/* "One" — white on dark bg, deep navy on light bg */}
        <span style={{ color: dark ? "#ffffff" : "#0D1B4B" }}>One</span>
        {/* "Link" — blue → cyan gradient matching the real logo */}
        <span
          style={{
            background: "linear-gradient(90deg, #1D4ED8 0%, #06B6D4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Link
        </span>
      </span>
    </div>
  );
}
