import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Users2,
    CalendarDays,
    Target,
    BarChart3,
    LogOut,
    ShieldCheck,
    UserCog,
    Menu,
    X,
} from "lucide-react";

const navItems = [
    { to: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, testId: "nav-dashboard" },
    { to: "/groups", label: "المجموعات", icon: Users2, testId: "nav-groups" },
    { to: "/meetings", label: "اللقاءات", icon: CalendarDays, testId: "nav-meetings" },
    { to: "/domains", label: "المجالات والكفايات", icon: Target, testId: "nav-domains" },
    { to: "/reports", label: "التقارير", icon: BarChart3, testId: "nav-reports" },
];

export default function Layout() {
    const { user, logout, isAdmin, can } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);

    useEffect(() => { setOpen(false); }, [location.pathname]);

    const roleLabel = { admin: "مشرف عام", manager: "مدير مجموعة", member: "عضو" }[user?.role] || "";
    const allowedNav = navItems.filter((it) => {
        const key = it.to.replace("/", "");
        return can(key);
    });

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Top bar with hamburger */}
            <header className="app-header no-print sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-border">
                <div className="flex items-center justify-between px-4 md:px-6 py-3">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setOpen(true)}
                            data-testid="open-sidebar-btn"
                            aria-label="فتح القائمة"
                        >
                            <Menu className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div className="font-bold text-base leading-tight">نظام اللقاءات</div>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-sm">
                        <div className="text-right">
                            <div className="font-medium leading-tight">{user?.name}</div>
                            <div className="text-xs text-muted-foreground">{roleLabel}</div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => { await logout(); navigate("/login"); }}
                            data-testid="header-logout-btn"
                        >
                            <LogOut className="w-4 h-4 ms-2" /> خروج
                        </Button>
                    </div>
                </div>
            </header>

            {/* Overlay */}
            {open && (
                <div
                    className="no-print fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                    onClick={() => setOpen(false)}
                    data-testid="sidebar-overlay"
                />
            )}

            {/* Off-canvas sidebar */}
            <aside
                className={`no-print fixed top-0 bottom-0 right-0 w-[280px] bg-white border-l border-border flex flex-col z-50 transition-transform duration-300 ease-in-out ${
                    open ? "translate-x-0" : "translate-x-full"
                }`}
                data-testid="sidebar"
            >
                <div className="p-5 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground grid place-items-center">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-lg leading-tight">نظام اللقاءات</div>
                            <div className="text-xs text-muted-foreground">تنظيم المجموعات</div>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpen(false)}
                        data-testid="close-sidebar-btn"
                        aria-label="إغلاق القائمة"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {allowedNav.map((it) => (
                        <NavLink
                            key={it.to}
                            to={it.to}
                            data-testid={it.testId}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
                                    isActive
                                        ? "bg-primary text-primary-foreground font-medium"
                                        : "text-foreground hover:bg-muted"
                                }`
                            }
                        >
                            <it.icon className="w-4 h-4" />
                            <span>{it.label}</span>
                        </NavLink>
                    ))}
                    {isAdmin && (
                        <>
                        <NavLink
                            to="/users"
                            data-testid="nav-users"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
                                    isActive
                                        ? "bg-primary text-primary-foreground font-medium"
                                        : "text-foreground hover:bg-muted"
                                }`
                            }
                        >
                            <UserCog className="w-4 h-4" />
                            <span>المستخدمون</span>
                        </NavLink>
                        <NavLink
                            to="/permissions"
                            data-testid="nav-permissions"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
                                    isActive
                                        ? "bg-primary text-primary-foreground font-medium"
                                        : "text-foreground hover:bg-muted"
                                }`
                            }
                        >
                            <ShieldCheck className="w-4 h-4" />
                            <span>الصلاحيات</span>
                        </NavLink>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-border">
                    <div className="mb-3 px-1">
                        <div className="text-sm font-medium truncate" data-testid="current-user-name">{user?.name}</div>
                        <div className="text-xs text-muted-foreground">{roleLabel}</div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={async () => { await logout(); navigate("/login"); }}
                        data-testid="logout-btn"
                    >
                        <LogOut className="w-4 h-4 ms-2" />
                        تسجيل الخروج
                    </Button>
                </div>
            </aside>

            {/* Main content — full width, no reserved sidebar space */}
            <main className="min-h-[calc(100vh-64px)]">
                <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
