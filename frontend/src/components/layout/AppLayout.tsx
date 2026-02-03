import { Outlet } from "react-router-dom";
import PrivateHeader from "./PrivateHeader";
import Menu from "./Menu";

export default function AppLayout() {

  return (
    <div className="app-layout">
      <PrivateHeader />

      <div className="app-body">
        <aside className="app-sidebar">
          <Menu />
        </aside>

        <main className="app-content">
          <Outlet />
        </main>
        </div>
    </div>
  );
}
