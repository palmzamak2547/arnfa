"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useLang } from "@/lib/i18n/useLang";

/** BottomNav — mobile app style bottom navigation bar */
export function BottomNav() {
  const pathname = usePathname();
  const { en } = useLang();

  // Hide bottom nav on specific routes if needed, but usually visible on mobile
  // We'll show it fixed at the bottom on sm/mobile screens, hidden on md+
  
  const navItems = [
    {
      name: en ? "Home" : "หน้าแรก",
      href: "/",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      name: en ? "Where" : "ไปไหนดี",
      href: "/where",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      )
    },
    {
      name: en ? "Saved" : "ที่บันทึก",
      href: "/trips",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )
    },
    {
      name: en ? "Profile" : "โปรไฟล์",
      href: "/trips/settings", // using settings page for profile
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-hairline bg-paper/90 backdrop-blur-[12px] pb-[var(--safe-b)] md:hidden">
      {navItems.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.name}
            href={item.href}
            className={clsx(
              "flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-colors",
              active ? "text-ink" : "text-ink-faint hover:text-ink-muted"
            )}
          >
            <div className={clsx("transition-transform duration-[var(--dur-fast)]", active && "scale-110")}>
              {item.icon}
            </div>
            <span className="font-thai text-[0.65rem] font-medium">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
