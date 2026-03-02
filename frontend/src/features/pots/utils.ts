import type { UIPot } from "./types"

export function getActiveLabel(
    pots: UIPot[],
    activeId: string | null,
    activeType: "pot" | "subpot" | null
): string {
    if (!activeId) return ""

    if (activeType === "pot") {
        const pot = pots.find(p => p.id === activeId)
        return pot?.name ?? ""
    }

    if (activeType === "subpot") {
        for (const pot of pots) {
            const sp = pot.sub_pots.find(s => s.id === activeId)
            if (sp) return sp.name
        }
    }

    return ""
}

export function generateTempId(): string {
    return "tmp_" + crypto.randomUUID()
}
