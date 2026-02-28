import type { SubPot } from "@/api/sub_pots.api"

export type UISubPot = Omit<SubPot, "current"> & {
    current?: number
    __isNew?: boolean
}

export type UIPot = {
    id: string
    name: string
    account_id: string
    position: number
    sub_pots: UISubPot[]
}
