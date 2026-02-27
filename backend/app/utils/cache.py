from datetime import date
from functools import lru_cache

def _periode_key(compte_id: str, start_day: int, today: date):
    return f"{compte_id}:{start_day}:{today.isoformat()}"