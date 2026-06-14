"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ModelSelector from "./ModelSelector";

const LINKS = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/profile", label: "CV Profile", icon: "◉" },
  { href: "/jobs", label: "Jobs", icon: "▤" },
  { href: "/contacts", label: "Contacts", icon: "✦" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col border-b border-zinc-800 bg-zinc-950 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center gap-2 px-5 py-4 md:py-5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          JH
        </span>
        <span className="text-lg font-semibold tracking-tight">JobHunt</span>
      </div>
      <ul className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pb-0">
        {LINKS.map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-brand-600/15 text-brand-400"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                <span className="text-base leading-none">{l.icon}</span>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-zinc-800 p-3 md:mt-auto">
        <ModelSelector />
      </div>
    </nav>
  );
}
