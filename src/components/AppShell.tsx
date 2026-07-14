import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Calendar,
  ScanLine,
  Users,
  History,
  ClipboardCheck,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode } from "react";

const tabs: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/emploi-du-temps", label: "EDT", icon: Calendar },
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/suivi", label: "Suivi", icon: ClipboardCheck },
  { to: "/bilan-classe", label: "Bilan", icon: BarChart3 },
  { to: "/aesh", label: "AESH", icon: Users },
  { to: "/historique", label: "Histo.", icon: History },
];

export function AppShell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow-md">
        <div className="px-4 pt-5 pb-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm/snug opacity-80 truncate">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      </header>

      <main className="flex-1 pb-28 px-4 pt-4 max-w-2xl w-full mx-auto">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border safe-bottom">
        <div className="max-w-2xl mx-auto grid grid-cols-7">
          {tabs.map((t) => {
            const active =
              t.to === "/" ? path === "/" : path === t.to || path.startsWith(t.to + "/");
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`size-6 ${active ? "stroke-[2.4]" : ""}`} />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
