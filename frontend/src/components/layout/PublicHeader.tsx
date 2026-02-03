import LanguageSelector from "../ui/LanguageSelector";
import ThemeSelector from "../ui/ThemeSelector";

export default function PublicHeader() {
  
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        display: "flex",
        gap: 8,
        zIndex: 10,
      }}
    >
      <LanguageSelector />
      <ThemeSelector />
    </div>
  );
}
