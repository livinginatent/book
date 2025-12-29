"use client";

import type { ReactNode } from "react";

interface SettingsContentProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function SettingsContent({
  title,
  description,
  children,
}: SettingsContentProps) {
  return (
    <main className="flex-1">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">{title}</h1>
          <p className="">{description}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
