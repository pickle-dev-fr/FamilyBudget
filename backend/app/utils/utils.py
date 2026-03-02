from datetime import date
import calendar

from sqlmodel import Session, select
from app.models import Pot, Account, User, Sub_Pot, Transaction

def get_default_for_account(session: Session, account_id: str) -> dict[str, str]:
    sub_pot = session.exec(
        select(Sub_Pot)
        .join(Pot)
        .where(
            Pot.account_id == account_id,
            Pot.position == 0,
            Sub_Pot.position == 0,
        )
    ).one()

    return {
        "pot_id": sub_pot.pot_id,
        "sub_pot_id": sub_pot.id,
    }