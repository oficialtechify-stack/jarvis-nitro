import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

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
  isThinking?: boolean;
  isSpeaking?: boolean;
  isListening?: boolean;
  interactive?: boolean;
}

type ShapeType = "circle" | "square" | "star" | "triangle" | "hexagon" | "blob";

export const ColorOrb: React.FC<OrbProps> = ({
  dimension = "192px",
  className,
  tones,
  spinDuration = 20,
  active = false,
  isThinking = false,
  isSpeaking = false,
  isListening = false,
  interactive = false,
}) => {
  const [currentShape, setCurrentShape] = useState<ShapeType>("circle");
  const [interactionCount, setInteractionCount] = useState(0);

  // Determine current active state mode
  const mode = isThinking
    ? "thinking"
    : isSpeaking
    ? "speaking"
    : isListening
    ? "listening"
    : "idle";

  // Beautiful J.A.R.V.I.S. cybernetic color palette shift according to active mode
  const getPaletteTones = () => {
    switch (mode) {
      case "thinking":
        return {
          base: "oklch(15% 0.05 290)",      // Dark violet base
          accent1: "oklch(60% 0.3 320)",     // Neon Magenta / Pink
          accent2: "oklch(45% 0.25 280)",    // Royal Violet
          accent3: "oklch(70% 0.2 340)",     // Laser Pink
        };
      case "speaking":
        return {
          base: "oklch(15% 0.04 60)",       // Dark amber base
          accent1: "oklch(75% 0.2 90)",      // Golden Amber
          accent2: "oklch(60% 0.22 60)",     // Neon Orange
          accent3: "oklch(85% 0.18 100)",    // Warm Yellow
        };
      case "listening":
        return {
          base: "oklch(15% 0.04 140)",      // Dark forest base
          accent1: "oklch(70% 0.22 140)",    // Radiant Emerald
          accent2: "oklch(62% 0.2 165)",     // Bright Mint
          accent3: "oklch(80% 0.15 120)",    // Quantum Lime
        };
      case "idle":
      default:
        return {
          base: "oklch(15% 0.04 200)",      // Deep slate core
          accent1: "oklch(65% 0.22 195)",   // Vibrant laser cyber cyan
          accent2: "oklch(52% 0.25 245)",   // Pure electric blue
          accent3: "oklch(78% 0.18 185)",   // Glowing quantum teal
        };
    }
  };

  const palette = { ...getPaletteTones(), ...tones };

  // Cycle shapes automatically when idle
  useEffect(() => {
    if (mode !== "idle") return;

    const shapesList: ShapeType[] = ["circle", "square", "star", "triangle", "hexagon", "blob"];
    const interval = setInterval(() => {
      setCurrentShape((prev) => {
        const currentIndex = shapesList.indexOf(prev);
        const nextIndex = (currentIndex + 1) % shapesList.length;
        return shapesList[nextIndex];
      });
    }, 4500); // Morph every 4.5 seconds

    return () => clearInterval(interval);
  }, [mode]);

  // Adjust shape instantly based on active status to match the expression
  useEffect(() => {
    if (isThinking) {
      setCurrentShape("triangle"); // Calculations/Vectors
    } else if (isSpeaking) {
      setCurrentShape("blob");     // Liquid organic speech
    } else if (isListening) {
      setCurrentShape("hexagon");  // Sound receptor grid
    } else {
      setCurrentShape("circle");   // Calibration/Calm
    }
  }, [isThinking, isSpeaking, isListening]);

  // Handle click interaction
  const handleInteraction = () => {
    if (!interactive) return;
    setInteractionCount((prev) => prev + 1);
    
    // Choose a random different shape
    const shapesList: ShapeType[] = ["circle", "square", "star", "triangle", "hexagon", "blob"];
    const filtered = shapesList.filter((s) => s !== currentShape);
    const randomShape = filtered[Math.floor(Math.random() * filtered.length)];
    setCurrentShape(randomShape);
  };

  // Convert shape to CSS clipPath and borderRadius configurations
  const getShapeStyles = () => {
    switch (currentShape) {
      case "square":
        return {
          borderRadius: "24%",
          clipPath: "inset(0% round 24%)",
        };
      case "star":
        return {
          borderRadius: "12%",
          clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
        };
      case "triangle":
        return {
          borderRadius: "10%",
          clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
        };
      case "hexagon":
        return {
          borderRadius: "15%",
          clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
        };
      case "blob":
        return {
          borderRadius: "42% 56% 72% 28% / 45% 45% 55% 55%",
          clipPath: "none", // standard rounded border provides natural liquid blob look
        };
      case "circle":
      default:
        return {
          borderRadius: "50%",
          clipPath: "circle(50% at 50% 50%)",
        };
    }
  };

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

  // Speeds up spin and animation duration depending on cognitive mode
  const computedDuration = isThinking
    ? spinDuration * 0.15
    : isSpeaking
    ? spinDuration * 0.3
    : isListening
    ? spinDuration * 0.5
    : active
    ? spinDuration * 0.4
    : spinDuration;

  const shapeStyles = getShapeStyles();

  // Thinking Vibration Shake coordinates
  const vibrationAnimate = isThinking
    ? {
        x: [0, -2, 2, -1, 1, -2, 1, 0],
        y: [0, 1, -2, 1, -1, 2, -1, 0],
      }
    : { x: 0, y: 0 };

  // Speaking soundwave pulsing scale
  const speakingScale = isSpeaking
    ? [1, 1.12, 0.96, 1.08, 1]
    : isListening
    ? [1, 1.05, 0.98, 1.03, 1]
    : 1;

  return (
    <motion.div
      onClick={handleInteraction}
      animate={{
        ...vibrationAnimate,
        scale: speakingScale,
        rotate: interactive ? interactionCount * 45 : 0,
      }}
      transition={
        isThinking
          ? { repeat: Infinity, duration: 0.4, ease: "linear" }
          : isSpeaking
          ? { repeat: Infinity, duration: 1.2, ease: "easeInOut" }
          : isListening
          ? { repeat: Infinity, duration: 2, ease: "easeInOut" }
          : { type: "spring", stiffness: 100 }
      }
      className={`relative cursor-pointer select-none ${interactive ? 'hover:scale-105 active:scale-95' : ''}`}
      style={{ width: dimension, height: dimension }}
    >
      {/* Outer Glow Halo Ring */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.2, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -inset-2 rounded-full pointer-events-none blur-md border-2 border-cyan-500/25 z-0"
            style={{
              borderColor:
                mode === "thinking"
                  ? "rgba(236, 72, 153, 0.3)"
                  : mode === "speaking"
                  ? "rgba(245, 158, 11, 0.3)"
                  : mode === "listening"
                  ? "rgba(16, 185, 129, 0.3)"
                  : "rgba(6, 182, 212, 0.3)",
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className={`color-orb border border-cyan-500/15 transition-all duration-700 ease-out w-full h-full ${className || ""}`}
        style={{
          borderRadius: shapeStyles.borderRadius,
          clipPath: shapeStyles.clipPath,
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
      >
        {/* Expression Face & Reticle overlays in the center of the orb */}
        {dimValue >= 34 && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            {mode === "thinking" ? (
              // Cognitive calculation spinning crosshairs
              <motion.svg
                width="60%"
                height="60%"
                viewBox="0 0 100 100"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)] opacity-90"
              >
                <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="15 8 5 8" />
                <path d="M 50 10 L 50 30 M 50 70 L 50 90 M 10 50 L 30 50 M 70 50 L 90 50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="6"
                  fill="currentColor"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              </motion.svg>
            ) : mode === "speaking" ? (
              // Audio / speech waveform rings
              <motion.div className="flex items-center gap-1.5 h-1/2 w-3/4 justify-center text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]">
                <motion.span
                  animate={{ height: ["10%", "90%", "10%"] }}
                  transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.0 }}
                  className="w-1 bg-current rounded-full"
                />
                <motion.span
                  animate={{ height: ["20%", "100%", "20%"] }}
                  transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                  className="w-1 bg-current rounded-full"
                />
                <motion.span
                  animate={{ height: ["30%", "70%", "30%"] }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                  className="w-1 bg-current rounded-full"
                />
                <motion.span
                  animate={{ height: ["20%", "95%", "20%"] }}
                  transition={{ duration: 0.45, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
                  className="w-1 bg-current rounded-full"
                />
                <motion.span
                  animate={{ height: ["10%", "80%", "10%"] }}
                  transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut", delay: 0.05 }}
                  className="w-1 bg-current rounded-full"
                />
              </motion.div>
            ) : mode === "listening" ? (
              // Active listening radar sonar ripples
              <motion.svg
                width="70%"
                height="70%"
                viewBox="0 0 100 100"
                className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] opacity-90"
              >
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  animate={{ scale: [0.4, 1], opacity: [1, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="25"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  animate={{ scale: [0.2, 0.8], opacity: [1, 0.1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
                />
                <circle cx="50" cy="50" r="8" fill="currentColor" className="animate-pulse" />
              </motion.svg>
            ) : (
              // Calm HUD target overlay
              <motion.svg
                width="50%"
                height="50%"
                viewBox="0 0 100 100"
                className="text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.7)] opacity-70"
                animate={{ rotate: -20 }}
                whileHover={{ rotate: 90 }}
                transition={{ duration: 0.5 }}
              >
                <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="10 5" />
                <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="4"
                  fill="currentColor"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </motion.svg>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ColorOrb;
