import { Outlet } from "react-router-dom";
import PrivateHeader from "./PrivateHeader";
import Menu from "./Menu";

export default function AppLayout() {
    return (
        <div className="drawer lg:drawer-open h-screen">
            <input
                id="app-drawer"
                type="checkbox"
                className="drawer-toggle"
            />

            {/* CONTENT */}
            <div className="drawer-content flex flex-col h-full bg-bg text-text">
                <PrivateHeader />

                {/* Mobile navbar */}
                <div className="navbar bg-base-100 lg:hidden">
                    <div className="flex-none">
                        <label
                            htmlFor="app-drawer"
                            className="btn btn-square btn-ghost"
                        >
                            ☰
                        </label>
                    </div>
                </div>

                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>

            {/* SIDEBAR */}
            <div className="drawer-side">
                <label
                    htmlFor="app-drawer"
                    className="drawer-overlay"
                ></label>

                <aside className="w-72 min-h-full h-full bg-base-200 p-4 overflow-y-auto">
                    <Menu />
                </aside>
            </div>
        </div>
    );
}