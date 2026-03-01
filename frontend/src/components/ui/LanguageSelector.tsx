import { useEffect, useState } from "react";
import i18n from "i18next";

interface LangOption {
    code: string;
    name: string;
}

const getLangOptions = (): LangOption[] => [
    { code: "fr", name: i18n.t("languageName", { lng: "fr" }) },
    { code: "en", name: i18n.t("languageName", { lng: "en" }) },
];

export default function LanguageSelector() {
    const [current, setCurrent] = useState(i18n.language);
    const [langs] = useState(getLangOptions());

    useEffect(() => {
        const handleChange = () => {
            setCurrent(i18n.language);
        };

        i18n.on("languageChanged", handleChange);
        return () => {
            i18n.off("languageChanged", handleChange);
        };
    }, []);

    return (
        <select
            className="select select-bordered select-sm bg-bg-soft text-text"
            value={current}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
        >
            {langs.map((lang) => (
                <option key={lang.code} value={lang.code}>
                    {lang.name}
                </option>
            ))}
        </select>
    );
}
