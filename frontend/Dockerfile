FROM node:20

WORKDIR /app

# Copier package.json pour installer vite vite
COPY package*.json ./

RUN npm install

# Copier le reste du code (prod) ou monter le volume en dev
COPY . .

# Commande dev pour hot reload
CMD ["npm", "run", "dev"]
