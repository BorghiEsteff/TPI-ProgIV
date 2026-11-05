# ==============================================================================
# Etapa 1: Build y dependencias
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copiar manifiestos de paquetes
COPY package*.json ./

# Instalar dependencias limpias para produccion
RUN npm ci --only=production

# ==============================================================================
# Etapa 2: Imagen Final Ligera de Produccion
# ==============================================================================
FROM node:20-alpine

# Buenas practicas de seguridad: usuario no privilegiado (non-root)
USER node
WORKDIR /home/node/app

# Copiar unicamente node_modules de produccion y codigo fuente
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src/ ./src/

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "src/server.js"]
