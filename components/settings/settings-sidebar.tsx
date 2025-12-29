"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
          className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors text-slate-400"
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
        <span className="text-sm text-slate-400">Settings</span>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 pr-6">
        <nav className="space-y-1">
          {settingsItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all border-l-2 -ml-1",
                  isActive
                    ? "border-l-slate-400 bg-slate-800/40 "
                    : "border-l-transparent text-primary  hover:bg-slate-800/20"
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
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                    isActive
                      ? "bg-slate-700 "
                      : "bg-slate-800/40  hover:text-slate-300"
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
