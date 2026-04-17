import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { useTranslation } from "react-i18next";
import type { AccountType, InterestFrequency } from "@/api/accounts.api";

export type AccountFormData = {
    name: string;
    startDay: number;
    initialValue: number;
    accountType: AccountType;
    savingsGoal: number | null;
    interestRate: number | null;
    interestFrequency: InterestFrequency | null;
};

type AccountsModalProps = {
    open: boolean;
    mode: "create" | "edit";
    onClose: () => void;
    onSubmit: (data: AccountFormData) => void;
    defaultValues?: Partial<AccountFormData>;
};

export default function AccountsModal({
  open,
  mode,
  onClose,
  onSubmit,
  defaultValues,
}: AccountsModalProps) {
    const { t } = useTranslation();

    const [name, setName] = useState("");
    const [startDay, setStartDay] = useState(1);
    const [initialValue, setInitialValue] = useState("0");
    const [accountType, setAccountType] = useState<AccountType>("NORMAL");
    const [savingsGoal, setSavingsGoal] = useState("");
    const [interestRate, setInterestRate] = useState("");
    const [interestFrequency, setInterestFrequency] = useState<InterestFrequency>("ANNUAL");

    useEffect(() => {
        if (defaultValues) {
            setName(defaultValues.name ?? "");
            setStartDay(defaultValues.startDay ?? 1);
            setInitialValue(String(defaultValues.initialValue ?? 0));
            setAccountType(defaultValues.accountType ?? "NORMAL");
            setSavingsGoal(defaultValues.savingsGoal != null ? String(defaultValues.savingsGoal) : "");
            setInterestRate(defaultValues.interestRate != null ? String(defaultValues.interestRate) : "");
            setInterestFrequency(defaultValues.interestFrequency ?? "ANNUAL");
        } else {
            setName("");
            setStartDay(1);
            setInitialValue("0");
            setAccountType("NORMAL");
            setSavingsGoal("");
            setInterestRate("");
            setInterestFrequency("ANNUAL");
        }
    }, [defaultValues, open]);

    function handleSubmit() {
        onSubmit({
            name,
            startDay,
            initialValue: parseFloat(initialValue) || 0,
            accountType,
            savingsGoal: savingsGoal !== "" ? parseFloat(savingsGoal) : null,
            interestRate: interestRate !== "" ? parseFloat(interestRate) : null,
            interestFrequency: accountType === "SAVINGS" ? interestFrequency : null,
        });
    }

    return (
        <Modal
            open={open}
            title={t(mode === "edit" ? "accounts.edit" : "accounts.create")}
            onClose={onClose}
            footer={
                <div className="flex justify-end gap-2 mt-4">
                    <button className="btn btn-outline" onClick={onClose}>
                        {t("common.cancel")}
                    </button>
                    <button className="btn btn-primary" onClick={handleSubmit}>
                        {t("common.save")}
                    </button>
                </div>
            }
        >
            <div className="flex flex-col gap-3">
                {/* Nom */}
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-text">{t("accounts.name")}</label>
                    <input
                        className="input input-bordered w-full bg-bg-soft text-text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                {/* Type — seulement en création */}
                {mode === "create" && (
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-text">{t("accounts.type")}</label>
                        <select
                            className="select select-bordered w-full bg-bg-soft text-text"
                            value={accountType}
                            onChange={(e) => setAccountType(e.target.value as AccountType)}
                        >
                            <option value="NORMAL">{t("accounts.type_normal")}</option>
                            <option value="SAVINGS">{t("accounts.type_savings")}</option>
                            <option value="INVESTMENT">{t("accounts.type_investment")}</option>
                        </select>
                    </div>
                )}

                {/* Début mois — uniquement pour compte courant */}
                {accountType === "NORMAL" && (
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-text">{t("accounts.start_day")}</label>
                        <input
                            className="input input-bordered w-full bg-bg-soft text-text"
                            type="number"
                            min={1}
                            max={31}
                            value={startDay}
                            onChange={(e) => setStartDay(Number(e.target.value))}
                        />
                    </div>
                )}

                {/* Valeur initiale — pas pour INVESTMENT (solde calculé depuis les actifs) */}
                {accountType !== "INVESTMENT" && (
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-text">{t("accounts.initial_value")}</label>
                        <input
                            className="input input-bordered w-full bg-bg-soft text-text"
                            type="text"
                            inputMode="decimal"
                            value={initialValue}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === "" || v === "-" || /^-?\d*\.?\d*$/.test(v)) setInitialValue(v);
                            }}
                        />
                    </div>
                )}

                {/* Champs épargne */}
                {accountType === "SAVINGS" && (
                    <>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-text">{t("accounts.savings_goal")}</label>
                            <input
                                className="input input-bordered w-full bg-bg-soft text-text"
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                value={savingsGoal}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === "" || /^\d*\.?\d*$/.test(v)) setSavingsGoal(v);
                                }}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-text">{t("accounts.interest_rate")}</label>
                            <div className="flex items-center gap-2">
                                <input
                                    className="input input-bordered w-full bg-bg-soft text-text"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0"
                                    value={interestRate}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        if (v === "" || /^\d*\.?\d*$/.test(v)) setInterestRate(v);
                                    }}
                                />
                                <span className="text-sm opacity-60">%</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-text">{t("accounts.interest_frequency")}</label>
                            <select
                                className="select select-bordered w-full bg-bg-soft text-text"
                                value={interestFrequency}
                                onChange={(e) => setInterestFrequency(e.target.value as InterestFrequency)}
                            >
                                <option value="ANNUAL">{t("accounts.frequency_annual")}</option>
                                <option value="MONTHLY">{t("accounts.frequency_monthly")}</option>
                                <option value="DAILY">{t("accounts.frequency_daily")}</option>
                            </select>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
