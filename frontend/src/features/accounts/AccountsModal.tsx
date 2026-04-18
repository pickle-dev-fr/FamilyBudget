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

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="text-sm font-medium text-base-content/70 mb-1 block">{children}</label>;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-xs font-semibold text-base-content/40 uppercase tracking-wider pb-1 mb-1 border-b border-base-300">
            {children}
        </div>
    );
}

export default function AccountsModal({ open, mode, onClose, onSubmit, defaultValues }: AccountsModalProps) {
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
                <>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>
                        {t("common.cancel")}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSubmit}>
                        {t("common.save")}
                    </button>
                </>
            }
        >
            <div className="flex flex-col gap-4">

                {/* ── Général ── */}
                <div className="flex flex-col gap-3">
                    <SectionHeader>{t("accounts.section_general")}</SectionHeader>

                    <div>
                        <FieldLabel>{t("accounts.name")}</FieldLabel>
                        <input
                            className="input input-bordered w-full"
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {mode === "create" && (
                        <div>
                            <FieldLabel>{t("accounts.type")}</FieldLabel>
                            <select
                                className="select select-bordered w-full"
                                value={accountType}
                                onChange={(e) => setAccountType(e.target.value as AccountType)}
                            >
                                <option value="NORMAL">{t("accounts.type_normal")}</option>
                                <option value="SAVINGS">{t("accounts.type_savings")}</option>
                                <option value="INVESTMENT">{t("accounts.type_investment")}</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* ── Paramètres (NORMAL only) ── */}
                {accountType === "NORMAL" && (
                    <div className="flex flex-col gap-3">
                        <SectionHeader>{t("accounts.section_settings")}</SectionHeader>

                        <div>
                            <FieldLabel>{t("accounts.start_day")}</FieldLabel>
                            <input
                                className="input input-bordered w-full"
                                type="number"
                                min={1}
                                max={31}
                                value={startDay}
                                onChange={(e) => setStartDay(Number(e.target.value))}
                            />
                        </div>

                        <div>
                            <FieldLabel>{t("accounts.initial_value")}</FieldLabel>
                            <input
                                className="input input-bordered w-full"
                                type="text"
                                inputMode="decimal"
                                value={initialValue}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === "" || v === "-" || /^-?\d*\.?\d*$/.test(v)) setInitialValue(v);
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* ── Valeur initiale (SAVINGS) ── */}
                {accountType === "SAVINGS" && (
                    <div>
                        <FieldLabel>{t("accounts.initial_value")}</FieldLabel>
                        <input
                            className="input input-bordered w-full"
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

                {/* ── Épargne (SAVINGS only) ── */}
                {accountType === "SAVINGS" && (
                    <div className="flex flex-col gap-3">
                        <SectionHeader>{t("accounts.section_savings")}</SectionHeader>

                        <div className="border-l-2 border-primary/30 pl-3 flex flex-col gap-3">
                            <div>
                                <FieldLabel>{t("accounts.savings_goal")}</FieldLabel>
                                <input
                                    className="input input-bordered w-full"
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
                            <div>
                                <FieldLabel>{t("accounts.interest_rate")}</FieldLabel>
                                <div className="flex items-center gap-2">
                                    <input
                                        className="input input-bordered flex-1"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={interestRate}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            if (v === "" || /^\d*\.?\d*$/.test(v)) setInterestRate(v);
                                        }}
                                    />
                                    <span className="text-sm text-base-content/50 font-medium">%</span>
                                </div>
                            </div>
                            <div>
                                <FieldLabel>{t("accounts.interest_frequency")}</FieldLabel>
                                <select
                                    className="select select-bordered w-full"
                                    value={interestFrequency}
                                    onChange={(e) => setInterestFrequency(e.target.value as InterestFrequency)}
                                >
                                    <option value="ANNUAL">{t("accounts.frequency_annual")}</option>
                                    <option value="MONTHLY">{t("accounts.frequency_monthly")}</option>
                                    <option value="DAILY">{t("accounts.frequency_daily")}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
