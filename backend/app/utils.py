from datetime import date
import calendar



def get_period_start(today: date, start_day: int) -> date:
    """
    Retourne la date de début de la période courante.

    Règles :
    - si today.day >= start_day → période commence ce mois
    - sinon → période commence le mois précédent
    - si start_day dépasse le nombre de jours du mois cible,
      on prend le dernier jour du mois
    """

    year = today.year
    month = today.month

    if today.day < start_day:
        month -= 1
        if month == 0:
            month = 12
            year -= 1

    last_day_of_month = calendar.monthrange(year, month)[1]
    day = min(start_day, last_day_of_month)

    return date(year, month, day)

def get_period_end(start_date: date) -> date:
    year = start_date.year
    month = start_date.month
    start_day = start_date.day

    if start_day == 1:
        # Fin = dernier jour du mois courant
        last_day = calendar.monthrange(year, month)[1]
        return date(year, month, last_day)

    # Sinon : mois suivant, jour = start_day - 1
    month += 1
    if month == 13:
        month = 1
        year += 1

    last_day_of_target_month = calendar.monthrange(year, month)[1]
    day = min(start_day - 1, last_day_of_target_month)

    return date(year, month, day)