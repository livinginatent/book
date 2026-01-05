"use client";

import {
  User,
  CreditCard,
  ArrowLeftRight,
  BookOpen,
  ShieldCheck,
  Bell,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

const settingsItems = [
  { href: "/settings/profile-account", label: "Profile & Account", icon: User },
  {
    href: "/settings/subscription-billing",
    label: "Subscription & Billing",
    icon: CreditCard,
  },
  {
    href: "/settings/data-migration",
    label: "Data & Migration",
    icon: ArrowLeftRight,
  },
  {
    href: "/settings/reading-preferences",
    label: "Reading Preferences",
    icon: BookOpen,
  },
  {
    href: "/settings/privacy-security",
    label: "Privacy & Security",
    icon: ShieldCheck,
  },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
];

export function SettingsSidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Toggle */}
      <div className="md:hidden flex items-center gap-2 mb-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
        <span className="text-sm font-medium text-foreground">Settings</span>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border pr-6">
        <nav className="space-y-1">
          {settingsItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (pathname === "/settings" &&
                item.href === "/settings/profile-account");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all border-l-2 -ml-1",
                  isActive
                    ? "border-l-primary bg-primary/10 text-primary"
                    : "border-l-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Tab List */}
      {mobileMenuOpen && (
        <div className="md:hidden mb-6 overflow-x-auto -mx-4 px-4">
          <nav className="flex gap-2 pb-2">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (pathname === "/settings" &&
                  item.href === "/settings/profile-account");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-card border border-border hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden xs:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
