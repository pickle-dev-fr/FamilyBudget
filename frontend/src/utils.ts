import { useEffect } from "react"

export function formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0") // Mois 1-12
    const day = date.getDate().toString().padStart(2, "0")
    return `${year}-${month}-${day}`
}


export function adaptDate(year: number, month: number, day: number): Date {
    // On tente de créer la date
    const tentative = new Date(year, month, day)

    // Si le jour n'est pas le même, c'est que ça a débordé
    if (tentative.getDate() !== day) {
        // Retourne le dernier jour du mois
        return new Date(year, month + 1, 0)
    }

    return tentative
}

export function formatAmount(value?: number | null) {
  const safeValue = typeof value === "number" ? value : 0;

  return safeValue.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function reorderIds<T extends { id: string }>(items: T[]): string[] {
    return items.map(i => i.id);
}

export function useClickOutside(
    ref: React.RefObject<HTMLElement | null>,
    onOutside: () => void
) {
    useEffect(() => {
        const handler = (e: PointerEvent) => {
            const el = ref.current
            if (!el) return

            if (!el.contains(e.target as Node)) {
                onOutside()
            }
        }

        document.addEventListener("pointerdown", handler)

        return () => {
            document.removeEventListener("pointerdown", handler)
        }
    }, [ref, onOutside])
}

