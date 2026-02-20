import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "dark" | "light";

export default function ThemeSelector() {
    const [theme, setTheme] = useState<Theme>(
        (localStorage.getItem("theme") as Theme) || "dark"
    );

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    return (
        <label className="flex items-center gap-2 cursor-pointer">
            <Sun className={`w-5 h-5 ${theme === "light" ? "text-yellow-400" : "text-gray-400"}`} />
            <input
                type="checkbox"
                className="toggle toggle-sm"
                checked={theme === "dark"}
                onChange={toggleTheme}
            />
            <Moon className={`w-5 h-5 ${theme === "dark" ? "text-blue-400" : "text-gray-400"}`} />
        </label>
    );
}
