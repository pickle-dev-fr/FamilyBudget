from sqlmodel import SQLModel

class ReorderIds(SQLModel):
    ordered_ids: list[str]