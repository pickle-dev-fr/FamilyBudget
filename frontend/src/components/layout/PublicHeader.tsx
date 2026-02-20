import LanguageSelector from "../ui/LanguageSelector";
import ThemeSelector from "../ui/ThemeSelector";

export default function PublicHeader() {
  
  return (
    <div className="flex items-center justify-end gap-4 p-4 bg-bg-soft">
        <LanguageSelector />
        <ThemeSelector />
    </div>
  );
}
