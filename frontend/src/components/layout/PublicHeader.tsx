import LanguageSelector from "../ui/LanguageSelector";
import ThemeSelector from "../ui/ThemeSelector";

export default function PublicHeader() {
    return (
        <div className="fixed top-4 right-4 z-10 flex items-center gap-3">
            <LanguageSelector />
            <ThemeSelector />
        </div>
    );
}
