import type { SousPot } from "@/api/sous_pots.api"

export type UISousPot = Omit<SousPot, "current"> & {
    current?: number
    __isNew?: boolean
}

export type UIPot = {
    id: string
    name: string
    compte_id: string
    position: number
    sous_pots: UISousPot[]
}
