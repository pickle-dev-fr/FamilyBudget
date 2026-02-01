# Image Python officielle
FROM python:3.12-slim

# Définir le répertoire de travail dans le container
WORKDIR /app

# Copier uniquement le fichier des dépendances pour installer vite
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier le reste du code (utile pour prod, mais en dev on monte le volume)
COPY . .

# Commande par défaut (dev avec hot reload)
CMD ["uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
