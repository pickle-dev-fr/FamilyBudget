from fastapi import FastAPI

app = FastAPI(title="FamilyBudget API")

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur FamilyBudget"}
