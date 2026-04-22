from datetime import date
from sqlmodel import Session, select

from app.models import Account, Pot, Sub_Pot, SubPotSnapshot
from app.services.sub_pot_service import SousPotService
from app.utils.budget_cycle import get_budget_cycle_for_month
from app.schemas.stats_schema import SubPotSnapshotPoint


class SnapshotService:

    @staticmethod
    def take_for_account(session: Session, account: Account, year: int, month: int) -> None:
        """Crée ou met à jour les snapshots de tous les sous-pots d'un compte pour un mois donné."""
        cycle = get_budget_cycle_for_month(year, month, account.start_day)

        pots = session.exec(
            select(Pot).where(Pot.account_id == account.id, Pot.position != 0)
        ).all()

        for pot in pots:
            sub_pots = session.exec(
                select(Sub_Pot).where(Sub_Pot.pot_id == pot.id, Sub_Pot.position != 0)
            ).all()
            for sp in sub_pots:
                current = round(SousPotService.calculer_current_mois(session, sp, ref_date=cycle["start"]), 2)
                remaining = round(sp.prevision - current, 2)

                existing = session.exec(
                    select(SubPotSnapshot).where(
                        SubPotSnapshot.sub_pot_id == sp.id,
                        SubPotSnapshot.year == year,
                        SubPotSnapshot.month == month,
                    )
                ).first()

                if existing:
                    existing.prevision = sp.prevision
                    existing.current = current
                    existing.remaining = remaining
                    session.add(existing)
                else:
                    session.add(SubPotSnapshot(
                        sub_pot_id=sp.id,
                        pot_id=pot.id,
                        account_id=account.id,
                        year=year,
                        month=month,
                        prevision=sp.prevision,
                        current=current,
                        remaining=remaining,
                    ))

        session.commit()

    @staticmethod
    def get_history(session: Session, account_id: str, n_months: int = 12) -> list[SubPotSnapshotPoint]:
        """Retourne l'historique des snapshots pour un compte, enrichi des noms."""
        snapshots = session.exec(
            select(SubPotSnapshot)
            .where(SubPotSnapshot.account_id == account_id)
            .order_by(SubPotSnapshot.year, SubPotSnapshot.month)
        ).all()

        # Limiter aux n_months derniers mois distincts
        months = sorted({(s.year, s.month) for s in snapshots})
        recent_months = set(months[-n_months:])
        snapshots = [s for s in snapshots if (s.year, s.month) in recent_months]

        result = []
        for s in snapshots:
            sp = session.get(Sub_Pot, s.sub_pot_id)
            pot = session.get(Pot, s.pot_id)
            result.append(SubPotSnapshotPoint(
                sub_pot_id=s.sub_pot_id,
                sub_pot=sp.name if sp else "—",
                pot=pot.name if pot else "—",
                year=s.year,
                month=s.month,
                prevision=s.prevision,
                current=s.current,
                remaining=s.remaining,
            ))

        return result
