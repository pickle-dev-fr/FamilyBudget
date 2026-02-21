from datetime import date
import calendar

from sqlmodel import Session, select
from app.models import Pot, Compte, User, Sous_Pot, Transaction

def get_default_for_compte(session: Session, compte_id: str) -> dict[str, str]:
    sous_pot = session.exec(
        select(Sous_Pot)
        .join(Pot)
        .where(
            Pot.compte_id == compte_id,
            Pot.position == 0,
            Sous_Pot.position == 0,
        )
    ).one()

    return {
        "pot_id": sous_pot.pot_id,
        "sous_pot_id": sous_pot.id,
    }