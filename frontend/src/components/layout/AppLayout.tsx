import { Outlet } from "react-router-dom";
import PrivateHeader from "./PrivateHeader";
import Menu from "./Menu";

export default function AppLayout() {

  return (
    <div className="flex flex-col h-screen bg-bg text-text">
        <PrivateHeader />

        <div className="flex flex-1 overflow-hidden">
            <aside className="w-60 bg-bg-soft p-4 overflow-y-auto">
                <Menu />
            </aside>

            <main className="flex-1 p-4 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    </div>
  );
}
