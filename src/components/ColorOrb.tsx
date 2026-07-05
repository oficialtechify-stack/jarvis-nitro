import React from "react";

interface OrbProps {
  dimension?: string;
  className?: string;
  tones?: {
    base?: string;
    accent1?: string;
    accent2?: string;
    accent3?: string;
  };
  spinDuration?: number;
  active?: boolean;
}

export const ColorOrb: React.FC<OrbProps> = ({
  dimension = "192px",
  className,
  tones,
  spinDuration = 20,
  active = false,
}) => {
  // Beautiful J.A.R.V.I.S. cybernetic color default palette
  const fallbackTones = {
    base: "oklch(15% 0.04 200)",      // Deep slate core
    accent1: "oklch(65% 0.22 195)",   // Vibrant laser cyber cyan
    accent2: "oklch(52% 0.25 245)",   // Pure electric blue
    accent3: "oklch(78% 0.18 185)",   // Glowing quantum teal
  };

  const palette = { ...fallbackTones, ...tones };

  const dimValue = parseInt(dimension.replace("px", ""), 10);

  const blurStrength =
    dimValue < 50 ? Math.max(dimValue * 0.008, 1) : Math.max(dimValue * 0.015, 4);

  const contrastStrength =
    dimValue < 50 ? Math.max(dimValue * 0.004, 1.2) : Math.max(dimValue * 0.008, 1.5);

  const pixelDot = dimValue < 50 ? Math.max(dimValue * 0.004, 0.05) : Math.max(dimValue * 0.008, 0.1);

  const shadowRange = dimValue < 50 ? Math.max(dimValue * 0.004, 0.5) : Math.max(dimValue * 0.008, 2);

  const maskRadius =
    dimValue < 30 ? "0%" : dimValue < 50 ? "5%" : dimValue < 100 ? "15%" : "25%";

  const adjustedContrast =
    dimValue < 30 ? 1.1 : dimValue < 50 ? Math.max(contrastStrength * 1.2, 1.3) : contrastStrength;

  // Faster spin duration when actively working or speaking for micro-interaction feedback
  const computedDuration = active ? spinDuration * 0.4 : spinDuration;

  return (
    <div
      className={`color-orb border border-cyan-500/15 ${className || ""}`}
      style={{
        width: dimension,
        height: dimension,
        "--base": palette.base,
        "--accent1": palette.accent1,
        "--accent2": palette.accent2,
        "--accent3": palette.accent3,
        "--spin-duration": `${computedDuration}s`,
        "--blur": `${blurStrength}px`,
        "--contrast": adjustedContrast,
        "--dot": `${pixelDot}px`,
        "--shadow": `${shadowRange}px`,
        "--mask": maskRadius,
      } as React.CSSProperties}
    />
  );
};

export default ColorOrb;
