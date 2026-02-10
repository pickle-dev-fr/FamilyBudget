import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Pot } from "@/api/pots.api";
import type { SousPot } from "@/api/sous_pots.api";

import SousPotTable from "@/features/pots/SousPotsTable";
import PotForm from "@/features/pots/PotForm";
import ConfirmModal from "@/components/layout/ConfirmModal";

type Props = {
    pot: Pot;
    sousPots: SousPot[];
    isDefault: boolean;
    onRename: (potId: string, name: string) => Promise<void>;
    onDelete: (potId: string) => Promise<void>;
};


export default function PotCard({
    pot,
    sousPots,
    isDefault,
    onRename,
    onDelete
}: Props) {
    const { t } = useTranslation();

    const [editing, setEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    if (editing) {
        return (
            <PotForm
                pot={pot}
                onSubmit={async name => {
                    await onRename(pot.id, name);
                    setEditing(false);
                }}
                onCancel={() => setEditing(false)}
            />
        );
    }

    return (
        <div className="card pot-card">
            <div className="pot-card-header">
                <h2 className="pot-card-title">{pot.name}</h2>

                <div className="pot-card-actions">
                    <button
                        className="btn btn-sm"
                        onClick={() => setEditing(true)}
                        title={t("common.edit")}
                        disabled={isDefault}
                    >
                        ✎
                    </button>

                    <button
                        className="btn btn-sm btn-danger"
                        onClick={() => setConfirmDelete(true)}
                        title={t("common.delete")}
                        disabled={isDefault}
                    >
                        🗑
                    </button>
                </div>
            </div>

            <SousPotTable sousPots={sousPots} />

            <ConfirmModal
                open={confirmDelete}
                title={t("pots.delete_title")}
                message={t("pots.confirm_delete")}
                onCancel={() => setConfirmDelete(false)}
                onConfirm={async () => {
                    await onDelete(pot.id);
                    setConfirmDelete(false);
                }}
            />
        </div>
    );
}
