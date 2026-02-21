"""
Gestion des cycles budgétaires.

Définition métier
-----------------
Un cycle budgétaire est défini par :

    - start  : jour `start_day` du mois M
    - end    : veille du start du mois suivant

Si un mois ne contient pas `start_day`,
on utilise le dernier jour du mois.

Rattachement d’un cycle à un mois :
-----------------------------------
Pour un mois calendaire donné, on sélectionne
le cycle possédant le plus de jours dans ce mois.

Seuls deux cycles sont candidats :
    - cycle du mois précédent
    - cycle du mois courant
"""

import calendar
from datetime import date, timedelta


# ============================================================
# Month helpers
# ============================================================

def previous_month(year: int, month: int) -> tuple[int, int]:
    """Retourne (year, month) du mois précédent."""
    if month == 1:
        return year - 1, 12
    return year, month - 1


def next_month(year: int, month: int) -> tuple[int, int]:
    """Retourne (year, month) du mois suivant."""
    if month == 12:
        return year + 1, 1
    return year, month + 1


def last_day_of_month(year: int, month: int) -> int:
    """Nombre de jours dans un mois."""
    return calendar.monthrange(year, month)[1]


# ============================================================
# Cycle construction
# ============================================================

def cycle_start(year: int, month: int, start_day: int) -> date:
    """
    Construit la date de début d’un cycle.

    Si start_day dépasse la taille du mois,
    on prend le dernier jour du mois.
    """
    day = min(start_day, last_day_of_month(year, month))
    return date(year, month, day)


def cycle_end(start_date: date, start_day: int) -> date:
    """
    Calcule la fin d’un cycle.

    Règle unique :
        end = prochain cycle_start - 1 jour
    """
    year, month = next_month(start_date.year, start_date.month)

    next_start = cycle_start(year, month, start_day)

    return next_start - timedelta(days=1)


def build_cycle(year: int, month: int, start_day: int) -> dict:
    """
    Construit entièrement un cycle pour un mois donné.
    """
    start = cycle_start(year, month, start_day)
    end = cycle_end(start, start_day)

    return {
        "start": start,
        "end": end,
    }


# ============================================================
# Overlap logic
# ============================================================

def days_of_cycle_in_month(
    start: date,
    end: date,
    year: int,
    month: int,
) -> int:
    """
    Retourne le nombre de jours d’un cycle présents
    dans un mois calendaire donné.
    """
    month_start = date(year, month, 1)
    month_end = date(year, month, last_day_of_month(year, month))

    overlap_start = max(start, month_start)
    overlap_end = min(end, month_end)

    if overlap_start > overlap_end:
        return 0

    return (overlap_end - overlap_start).days + 1


# ============================================================
# Main public API
# ============================================================

def get_budget_cycle_for_month(
    year: int,
    month: int,
    start_day: int,
) -> dict:
    """
    Retourne le cycle budgétaire rattaché à un mois.

    Algorithme :
        1. construire cycle courant
        2. construire cycle précédent
        3. compter les jours de chacun dans le mois cible
        4. retourner celui majoritaire
    """

    # cycle courant
    current = build_cycle(year, month, start_day)

    # cycle précédent
    prev_year, prev_month = previous_month(year, month)
    previous = build_cycle(prev_year, prev_month, start_day)

    current_days = days_of_cycle_in_month(
        current["start"],
        current["end"],
        year,
        month,
    )

    previous_days = days_of_cycle_in_month(
        previous["start"],
        previous["end"],
        year,
        month,
    )

    if previous_days > current_days:
        return previous

    return current


# ============================================================
# Convenience helpers
# ============================================================

def get_budget_cycle_for_date(
    target_date: date,
    start_day: int,
) -> dict:
    """
    Retourne le cycle budgétaire correspondant
    à la date donnée.
    """
    return get_budget_cycle_for_month(
        target_date.year,
        target_date.month,
        start_day,
    )