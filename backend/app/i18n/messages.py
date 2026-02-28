# app/i18n/messages.py
import json
import os
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent

SUPPORTED_LANGS = {"fr", "en"}
DEFAULT_LANG = "fr"


def _load(lang: str) -> dict:
    path = BASE_DIR / f"{lang}.json"
    with path.open(encoding="utf-8") as f:
        return json.load(f)


_MESSAGES = {
    lang: _load(lang)
    for lang in SUPPORTED_LANGS
}


def _get_lang() -> str:
    return os.getenv("APP_LANG", DEFAULT_LANG)


def msg(key: str) -> str:
    """
    key example: 'transaction.debit.requires_sub_pot'
    """
    lang = _get_lang()
    data = _MESSAGES.get(lang, _MESSAGES[DEFAULT_LANG])

    current: Any = data
    for part in key.split("."):
        if not isinstance(current, dict) or part not in current:
            return key
        current = current[part]

    return current if isinstance(current, str) else key
