import type React from "react";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <SettingsSidebar />
          {children}
        </div>
      </div>
    </div>
  );
}
