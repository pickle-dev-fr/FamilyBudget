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
    Retourne le cycle budgétaire contenant une date donnée.

    Logique :
        - Si le jour de la date >= start_day :
            le cycle démarre dans le mois courant.
        - Sinon :
            le cycle démarre dans le mois précédent.

    La fin du cycle est calculée comme :
        prochain cycle_start - 1 jour

    Remarque :
        Cette fonction détermine uniquement le cycle actif.
        Elle ne décide pas du mois de rattachement majoritaire.
    """

    year = target_date.year
    month = target_date.month

    # Détermination du mois de départ du cycle
    if target_date.day >= start_day:
        # Le cycle commence ce mois-ci
        start = cycle_start(year, month, start_day)
    else:
        # Le cycle commence le mois précédent
        prev_year, prev_month = previous_month(year, month)
        start = cycle_start(prev_year, prev_month, start_day)

    # Calcul systématique de la fin : prochain start - 1 jour
    end = cycle_end(start, start_day)

    return {
        "start": start,
        "end": end,
    }

def get_majority_year_month_for_date(
    target_date: date,
    start_day: int,
) -> tuple[int, int]:
    """
    Retourne (year, month) correspondant au mois
    majoritaire du cycle contenant la date donnée.

    Algorithme :
        1. Construire le cycle actif via get_budget_cycle_for_date.
        2. Calculer le nombre de jours du cycle dans :
            - le mois du start
            - le mois du end
        3. Retourner le mois possédant le plus de jours.

    Hypothèse structurelle :
        Un cycle couvre au maximum deux mois calendaires,
        donc seule cette comparaison est nécessaire.

    Cette méthode implémente strictement la règle métier :
        "Un cycle est rattaché au mois dans lequel il possède
        le plus de jours."
    """

    cycle = get_budget_cycle_for_date(target_date, start_day)

    start = cycle["start"]
    end = cycle["end"]

    # Nombre de jours du cycle dans le mois du start
    days_start_month = days_of_cycle_in_month(
        start,
        end,
        start.year,
        start.month,
    )

    # Nombre de jours du cycle dans le mois du end
    days_end_month = days_of_cycle_in_month(
        start,
        end,
        end.year,
        end.month,
    )

    # Comparaison majoritaire
    if days_end_month > days_start_month:
        return end.year, end.month

    return start.year, start.month