from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session
from datetime import date
from sqlmodel import Session
from app.database import engine
from app.services.cron_service import process_recurrences

scheduler = AsyncIOScheduler()

def start_scheduler():
    scheduler.add_job(
        process_recurrences_job,
        "cron",
        hour=0,
        minute=5
    )
    scheduler.start()


def process_recurrences_job():
    with Session(engine) as session:
        process_recurrences(session)