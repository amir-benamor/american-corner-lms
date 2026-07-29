"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  BookOpen,
  Library,
  Users,
  Calendar,
  ScanLine,
  MessageSquare,
  LayoutDashboard,
  Settings,
  LogOut,
  BarChart3,
  BookMarked,
} from "lucide-react";
import type { Role } from "@/types";
import { Button } from "../ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["super_admin", "librarian", "member"] },
  { label: "Catalog", href: "/dashboard/books", icon: Library, roles: ["super_admin", "librarian", "member"] },
  { label: "Scanner", href: "/dashboard/scanner", icon: ScanLine, roles: ["super_admin", "librarian"] },
  { label: "Loans", href: "/dashboard/loans", icon: BookMarked, roles: ["super_admin", "librarian", "member"] },
  { label: "Events", href: "/dashboard/events", icon: Calendar, roles: ["super_admin", "librarian", "member"] },
  { label: "Members", href: "/dashboard/members", icon: Users, roles: ["super_admin", "librarian"] },
  { label: "AI Assistant", href: "/dashboard/ai", icon: MessageSquare, roles: ["super_admin", "librarian", "member"] },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, roles: ["super_admin"] },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["super_admin"] },
];

interface SidebarProps {
  role: Role;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const filtered = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        <BookOpen className="h-6 w-6 text-sidebar-primary" />
        <div>
          <p className="font-bold text-sm">American Corner</p>
          <p className="text-xs text-sidebar-foreground/70">Sousse Library</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filtered.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 text-sm">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium text-sm">{userName}</p>
            <p className="truncate text-xs text-sidebar-foreground/60 capitalize">{role.replace("_", " ")}</p>
          </div>
        </div>
        <form action="/api/auth/signout" method="post" className="mt-1">
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground" asChild>
            <button type="submit">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </Button>
        </form>
      </div>
    </aside>
  );
}
