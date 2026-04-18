import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Menu from "./Menu";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { Menu as MenuIcon } from "lucide-react";
import { AppIcon } from "@/components/ui/FamilyBudgetLogo";
import { usePageTitle } from "@/hooks/usePageTitle";

function closeDrawer() {
    const drawer = document.getElementById("app-drawer") as HTMLInputElement | null;
    if (drawer) drawer.checked = false;
}

export default function AppLayout() {
    const pageTitle = usePageTitle();
    const { pathname } = useLocation();
    const mainRef = useRef<HTMLElement>(null);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);

    // Scroll to top on route change
    useEffect(() => {
        mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }, [pathname]);

    // ESC closes drawer
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") closeDrawer();
        }
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, []);

    // Swipe left to close drawer
    useEffect(() => {
        function onTouchStart(e: TouchEvent) {
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
        }
        function onTouchEnd(e: TouchEvent) {
            const dx = touchStartX.current - e.changedTouches[0].clientX;
            const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
            if (dx > 60 && dy < 40) closeDrawer();
        }
        document.addEventListener("touchstart", onTouchStart, { passive: true });
        document.addEventListener("touchend", onTouchEnd, { passive: true });
        return () => {
            document.removeEventListener("touchstart", onTouchStart);
            document.removeEventListener("touchend", onTouchEnd);
        };
    }, []);

    return (
        <div className="drawer lg:drawer-open h-screen">
            <input id="app-drawer" type="checkbox" className="drawer-toggle" />

            {/* CONTENT */}
            <div className="drawer-content flex flex-col h-full bg-base-200">
                {/* Mobile topbar */}
                <div className="lg:hidden flex items-center h-14 px-2 bg-base-100 border-b border-base-300 gap-2 shrink-0">
                    <label htmlFor="app-drawer" className="btn btn-ghost btn-sm btn-square">
                        <MenuIcon size={20} />
                    </label>
                    <AppIcon size={22} />
                    <span className="font-semibold text-sm truncate flex-1">{pageTitle}</span>
                </div>

                <main ref={mainRef} className="relative flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <LoadingOverlay />
                    <div className="page-fade">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* SIDEBAR */}
            <div className="drawer-side z-40">
                <label htmlFor="app-drawer" className="drawer-overlay" />
                <aside className="w-full lg:w-60 min-h-full h-full bg-base-100 lg:border-r border-base-300 flex flex-col overflow-y-auto">
                    <Menu />
                </aside>
            </div>
        </div>
    );
}
