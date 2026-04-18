import { Outlet } from "react-router-dom";
import Menu from "./Menu";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { Menu as MenuIcon } from "lucide-react";
import { FamilyBudgetLogo } from "@/components/ui/FamilyBudgetLogo";

export default function AppLayout() {
    return (
        <div className="drawer lg:drawer-open h-screen">
            <input id="app-drawer" type="checkbox" className="drawer-toggle" />

            {/* CONTENT */}
            <div className="drawer-content flex flex-col h-full bg-base-200">
                {/* Mobile topbar */}
                <div className="lg:hidden flex items-center justify-between px-4 h-16 bg-base-100 border-b border-base-300 shrink-0">
                    <FamilyBudgetLogo size="md" />
                    <label htmlFor="app-drawer" className="btn btn-ghost btn-sm btn-square">
                        <MenuIcon size={20} />
                    </label>
                </div>

                <main className="relative flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <LoadingOverlay />
                    <Outlet />
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
