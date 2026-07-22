import React, { useEffect, useState } from "react";
import { motion } from "motion/react";

interface AnimatedRocketProps {
  size?: number; // Size of the rocket container in px
  className?: string;
  showGlow?: boolean;
}

export default function AnimatedRocket({
  size = 24,
  className = "",
  showGlow = true,
}: AnimatedRocketProps) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Light Mode colors vs Dark Mode colors per specification:
  // Light Mode: Body = Black (#0F172A), Details = Dark Gray (#374151), Window = Blue (#2563EB)
  // Dark Mode: Body = White (#FFFFFF), Details = Light Gray (#E5E7EB), Window = Blue (#3B82F6)
  const bodyColor = isDark ? "#FFFFFF" : "#0F172A";
  const detailColor = isDark ? "#E5E7EB" : "#374151";
  const windowColor = isDark ? "#3B82F6" : "#2563EB";
  const windowRingColor = isDark ? "#1E293B" : "#F8FAFC";

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Radiant Orange Thruster Glow Background (Visible in both Light & Dark Mode) */}
      {showGlow && (
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full bg-[#FF7A00]/30 blur-md pointer-events-none"
        />
      )}

      {/* Main Rocket SVG Container rotated exactly by -60° (taking off 60° upward) */}
      <motion.div
        animate={{
          x: [0, 1.2, 0],
          y: [0, -2.2, 0],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          transform: "rotate(60deg)",
          transformOrigin: "center center",
          willChange: "transform",
        }}
        className="relative z-10 flex items-center justify-center"
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          <defs>
            {/* Bright Orange Exhaust Flame Gradient (#FF7A00 to #FFA500) */}
            <linearGradient id="rocketExhaustFlame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFA500" />
              <stop offset="50%" stopColor="#FF7A00" />
              <stop offset="100%" stopColor="#FF3D00" />
            </linearGradient>

            {/* Flame Glow Filter */}
            <filter id="exhaustGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Engine Exhaust Flame (Bright Orange #FF7A00 -> #FFA500 with Glow) */}
          <motion.g
            animate={{
              scaleY: [0.85, 1.35, 0.85],
              scaleX: [0.9, 1.15, 0.9],
              opacity: [0.9, 1, 0.9],
            }}
            transition={{
              duration: 0.25,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "16px 23px" }}
            filter="url(#exhaustGlow)"
          >
            {/* Outer Flame (#FF7A00 to #FFA500) */}
            <path
              d="M12 23C12 23 16 31 16 31C16 31 20 23 20 23C18.8 25 17.5 26 16 26C14.5 26 13.2 25 12 23Z"
              fill="url(#rocketExhaustFlame)"
            />
            {/* Hot Inner Flame Core */}
            <path
              d="M14 23C14 23 16 28.5 16 28.5C16 28.5 18 23 18 23C17.3 24.2 16.7 24.5 16 24.5C15.3 24.5 14.7 24.2 14 23Z"
              fill="#FFE600"
            />
          </motion.g>

          {/* Fading Small Exhaust Particles Shooting Backward */}
          <motion.circle
            cx="16"
            cy="28"
            r="1"
            fill="#FF7A00"
            animate={{
              cy: [28, 34],
              opacity: [1, 0],
              r: [1.2, 0.2],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0,
            }}
          />
          <motion.circle
            cx="14"
            cy="27"
            r="0.9"
            fill="#FFA500"
            animate={{
              cy: [27, 33],
              cx: [14, 12],
              opacity: [1, 0],
              r: [1, 0.1],
            }}
            transition={{
              duration: 0.45,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.15,
            }}
          />
          <motion.circle
            cx="18"
            cy="27"
            r="0.9"
            fill="#FF3D00"
            animate={{
              cy: [27, 33],
              cx: [18, 20],
              opacity: [1, 0],
              r: [1, 0.1],
            }}
            transition={{
              duration: 0.45,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.3,
            }}
          />

          {/* Left Wing / Fin */}
          <path
            d="M10 16L4 21V23.5L10 20.5V16Z"
            fill={detailColor}
          />

          {/* Right Wing / Fin */}
          <path
            d="M22 16L28 21V23.5L22 20.5V16Z"
            fill={detailColor}
          />

          {/* Main Rocket Nose & Body Cone */}
          <path
            d="M16 1.5C10.5 6.5 9.5 13.5 9.5 20.5C9.5 21.8 10.5 22.8 11.8 22.8H20.2C21.5 22.8 22.5 21.8 22.5 20.5C22.5 13.5 21.5 6.5 16 1.5Z"
            fill={bodyColor}
          />

          {/* Center Engine Nozzle Base */}
          <path
            d="M12.5 22.8H19.5V24.2H12.5V22.8Z"
            fill={detailColor}
          />

          {/* Window Ring */}
          <circle cx="16" cy="11.5" r="3.6" fill={windowRingColor} />
          {/* Blue Porthole Window */}
          <circle cx="16" cy="11.5" r="2.6" fill={windowColor} />
          {/* Window Glass Glint */}
          <circle cx="15.2" cy="10.7" r="0.8" fill="#FFFFFF" opacity="0.85" />
        </svg>
      </motion.div>
    </div>
  );
}
