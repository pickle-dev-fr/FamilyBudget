import { useState, useEffect } from "react";
import { t } from "i18next";
import Modal from "@/components/ui/Modal";

export type CompteFormData = {
    name: string;
    startDay: number;
    initialValue: number;
    decallage: number;
};

type ComptesModalProps = {
    open: boolean;
    mode: "create" | "edit";
    onClose: () => void;
    onSubmit: (data: CompteFormData) => void;
    defaultValues?: CompteFormData;
};

export default function ComptesModal({
  open,
  mode,
  onClose,
  onSubmit,
  defaultValues,
}: ComptesModalProps) {

    const [startDay, setStartDay] = useState(1);
    const [initialValue, setInitialValue] = useState(0);
    const [name, setName] = useState("");
    const [decallage, setDecallage] = useState(0);


    useEffect(() => {
        if (defaultValues) {
            setName(defaultValues.name);
            setStartDay(defaultValues.startDay);
            setInitialValue(defaultValues.initialValue);
            setDecallage(defaultValues.decallage);
        } else {
            setName("");
            setStartDay(1);
            setInitialValue(0);
            setDecallage(0);
        }
    }, [defaultValues, open]);


    function handleSubmit() {
        onSubmit({
            name,
            startDay,
            initialValue,
            decallage,
        });
    }

    return (
        <Modal
            open={open}
            title={t(mode === "edit" ? "accounts.edit" : "accounts.create")}
            onClose={onClose}
            footer={
                <div className="flex justify-end gap-2 mt-4">
                    <button
                        className="btn btn-outline"
                        onClick={onClose}
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                    >
                        {t("common.save")}
                    </button>
                </div>
            }
        >
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-text">
                        {t("accounts.name")}
                    </label>
                    <input
                        className="input input-bordered w-full bg-bg-soft text-text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-text">
                        {t("accounts.start_day")}
                    </label>
                    <input
                        className="input input-bordered w-full bg-bg-soft text-text"
                        type="number"
                        min={1}
                        max={31}
                        value={startDay}
                        onChange={(e) => setStartDay(Number(e.target.value))}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-text">
                        {t("accounts.initial_value")}
                    </label>
                    <input
                        className="input input-bordered w-full bg-bg-soft text-text"
                        type="number"
                        value={initialValue}
                        onChange={(e) => setInitialValue(Number(e.target.value))}
                    />
                </div>
            </div>
        </Modal>
    );
}
