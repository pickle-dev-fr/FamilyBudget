import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import { useTranslation } from "react-i18next";
import type { AssetType, TickerSearchResult } from "@/api/accounts.api";
import { searchTickers } from "@/api/accounts.api";

export type AssetFormData = {
    ticker: string;
    name: string;
    asset_type: AssetType;
    quantity: number;
};

type AssetModalProps = {
    open: boolean;
    mode: "create" | "edit";
    defaultValues?: Partial<AssetFormData>;
    onClose: () => void;
    onSubmit: (data: AssetFormData) => void;
};

export default function AssetModal({ open, mode, defaultValues, onClose, onSubmit }: AssetModalProps) {
    const { t } = useTranslation();

    const [ticker, setTicker] = useState("");
    const [name, setName] = useState("");
    const [assetType, setAssetType] = useState<AssetType>("STOCK");
    const [quantity, setQuantity] = useState("1");

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<TickerSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (defaultValues) {
            setTicker(defaultValues.ticker ?? "");
            setName(defaultValues.name ?? "");
            setAssetType(defaultValues.asset_type ?? "STOCK");
            setQuantity(defaultValues.quantity != null ? String(defaultValues.quantity) : "1");
            setQuery(defaultValues.ticker ?? "");
        } else {
            setTicker("");
            setName("");
            setAssetType("STOCK");
            setQuantity("1");
            setQuery("");
        }
        setSuggestions([]);
        setShowDropdown(false);
    }, [defaultValues, open]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (query.trim().length < 1) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const results = await searchTickers(query.trim());
                setSuggestions(results);
                setShowDropdown(results.length > 0);
            } catch {
                setSuggestions([]);
            } finally {
                setSearching(false);
            }
        }, 350);
    }, [query]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function selectSuggestion(s: TickerSearchResult) {
        setTicker(s.ticker);
        setName(s.name);
        setAssetType(s.asset_type);
        setQuery(s.ticker);
        setShowDropdown(false);
        setSuggestions([]);
    }

    function handleQueryChange(value: string) {
        setQuery(value);
        setTicker(value.trim().toUpperCase());
    }

    function handleSubmit() {
        onSubmit({
            ticker: ticker.trim().toUpperCase(),
            name: name.trim(),
            asset_type: assetType,
            quantity: parseFloat(quantity) || 0,
        });
    }

    const ASSET_TYPE_LABEL: Record<AssetType, string> = {
        STOCK: t("accounts.asset_type_stock"),
        ETF: "ETF",
        CRYPTO: t("accounts.asset_type_crypto"),
    };

    return (
        <Modal
            open={open}
            title={t(mode === "edit" ? "accounts.asset_edit" : "accounts.asset_add")}
            onClose={onClose}
            footer={
                <div className="flex justify-end gap-2 mt-4">
                    <button className="btn btn-outline" onClick={onClose}>{t("common.cancel")}</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>{t("common.save")}</button>
                </div>
            }
        >
            <div className="flex flex-col gap-3">
                {/* Recherche ticker */}
                <div className="flex flex-col gap-1" ref={dropdownRef}>
                    <label className="text-sm font-medium text-text">{t("accounts.asset_ticker")}</label>
                    <div className="relative">
                        <div className="relative flex items-center">
                            <input
                                className="input input-bordered w-full bg-bg-soft text-text uppercase pr-8"
                                placeholder="AAPL, BTC-USD, IWDA.AS…"
                                value={query}
                                onChange={(e) => handleQueryChange(e.target.value)}
                                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                                autoComplete="off"
                            />
                            {searching && (
                                <span className="absolute right-3 loading loading-spinner loading-xs opacity-50" />
                            )}
                        </div>
                        {showDropdown && (
                            <ul className="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg overflow-hidden">
                                {suggestions.map((s) => (
                                    <li
                                        key={s.ticker}
                                        className="flex items-center justify-between px-3 py-2 hover:bg-base-200 cursor-pointer"
                                        onMouseDown={() => selectSuggestion(s)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-semibold text-sm">{s.ticker}</span>
                                            <span className="text-sm opacity-70 truncate max-w-[180px]">{s.name}</span>
                                        </div>
                                        <span className="badge badge-xs badge-ghost shrink-0">{ASSET_TYPE_LABEL[s.asset_type]}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Nom */}
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-text">{t("accounts.asset_name")}</label>
                    <input
                        className="input input-bordered w-full bg-bg-soft text-text"
                        placeholder="Apple Inc., Bitcoin…"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                {/* Type */}
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-text">{t("accounts.asset_type")}</label>
                    <select
                        className="select select-bordered w-full bg-bg-soft text-text"
                        value={assetType}
                        onChange={(e) => setAssetType(e.target.value as AssetType)}
                    >
                        <option value="STOCK">{t("accounts.asset_type_stock")}</option>
                        <option value="ETF">{t("accounts.asset_type_etf")}</option>
                        <option value="CRYPTO">{t("accounts.asset_type_crypto")}</option>
                    </select>
                </div>

                {/* Quantité */}
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-text">{t("accounts.asset_quantity")}</label>
                    <input
                        className="input input-bordered w-full bg-bg-soft text-text"
                        type="text"
                        inputMode="decimal"
                        value={quantity}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v === "" || /^\d*\.?\d*$/.test(v)) setQuantity(v);
                        }}
                    />
                </div>
            </div>
        </Modal>
    );
}
