import { useTranslation } from "react-i18next";
import type { SousPot } from "@/api/sous_pots.api";

function computeReste(prevision: number, current: number): number {
    return prevision - current;
}

function computeRatio(prevision: number, current: number): number {
    if (prevision <= 0) {
        return 0;
    }
    return current / prevision;
}

function computeRemainingPercent(prevision: number, current: number): number {
    const ratio = computeRatio(prevision, current);
    return Math.max(0, Math.round((1 - ratio) * 100));
}

type Props = {
    sousPots: SousPot[];
};

export default function SousPotTable({ sousPots }: Props) {
    const { t } = useTranslation();

    return (
        <table className="table table-fixed">
            <colgroup>
                <col style={{ width: "30%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "30%" }} />
            </colgroup>
            <thead>
                <tr>
                    <th>{t("sous_pots.name")}</th>
                    <th>{t("sous_pots.prevision")}</th>
                    <th>{t("sous_pots.reste")}</th>
                    <th>{t("sous_pots.progression")}</th>
                </tr>
            </thead>
            <tbody>
                {sousPots.length === 0 && (
                    <tr>
                        <td colSpan={4} className="text-muted">
                            {t("sous_pots.aucun")}
                        </td>
                    </tr>
                )}

                {sousPots.map(sp => {
                    const reste = computeReste(sp.prevision, sp.current);
                    const ratio = computeRatio(sp.prevision, sp.current);
                    const cappedRatio = Math.min(ratio, 1);
                    const isOver = ratio > 1;
                    const remainingPercent = computeRemainingPercent(sp.prevision, sp.current);

                    return (
                        <tr key={sp.id}>
                            <td>{sp.name}</td>
                            <td>{sp.prevision.toFixed(2)} €</td>
                            <td className={reste < 0 ? "text-danger" : "text-success"}>
                                {reste.toFixed(2)} €
                            </td>
                            <td>
                                <div className="progress-container">
                                    <div className="progress">
                                        <div
                                            className={`progress-bar ${isOver ? "progress-bar-danger" : "progress-bar-success"}`}
                                            style={{ width: `${cappedRatio * 100}%` }}
                                        />
                                    </div>
                                    <span className={reste < 0 ? "text-danger" : "text-success"}>
                                        {remainingPercent}%
                                    </span>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
