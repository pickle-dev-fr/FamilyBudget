import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export default function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>(
    (localStorage.getItem("theme") as Theme) || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as Theme)}
      style={{ width: "100%" }}
    >
      <option value="dark">Dark</option>
      <option value="light">Light</option>
    </select>
  );
}
