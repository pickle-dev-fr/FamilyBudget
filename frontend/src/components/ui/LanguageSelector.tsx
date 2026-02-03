import i18n from "i18next";

export default function LanguageSelector() {
  const current = i18n.language;

  return (
    <select
      value={current}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      style={{ width: "100%" }}
    >
      <option value="fr">Français</option>
      <option value="en">English</option>
    </select>
  );
}
