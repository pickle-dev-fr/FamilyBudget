from datetime import date
from functools import lru_cache

def _periode_key(account_id: str, start_day: int, today: date):
    return f"{account_id}:{start_day}:{today.isoformat()}"