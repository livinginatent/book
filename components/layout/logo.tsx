"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export function Logo({ width = 110, height = 110, className }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use dark mode logo when theme is dark, otherwise use light mode logo
  const logoSrc =
    mounted && resolvedTheme === "dark"
      ? "/booktab-dark-mode.png"
      : "/booktab-Photoroom.png";

  return (
    <div className={`relative group-hover:rotate-6 transition-transform ${className || ""}`}>
      <Image
        src={logoSrc}
        alt="Booktab logo"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
    </div>
  );
}

