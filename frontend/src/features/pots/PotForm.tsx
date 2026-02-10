import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Pot } from "@/api/pots.api";

type Props = {
    pot?: Pot | null;
    onSubmit: (name: string) => void;
    onCancel: () => void;
};

export default function PotForm({ pot, onSubmit, onCancel }: Props) {
    const { t } = useTranslation();
    const [name, setName] = useState(pot?.name ?? "");

    return (
        <div className="card">
            <label className="label">
                {t("pots.name")}
            </label>

            <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
            />

            <div className="actions">
                <button
                    className="btn btn-primary"
                    disabled={name.trim().length === 0}
                    onClick={() => onSubmit(name.trim())}
                >
                    {pot ? t("common.save") : t("common.create")}
                </button>

                <button
                    className="btn"
                    onClick={onCancel}
                >
                    {t("common.cancel")}
                </button>
            </div>
        </div>
    );
}
