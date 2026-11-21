FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

ARG VITE_DJANGO_API_URL=/django/api/v1
ARG VITE_DJANGO_GRAPHQL_URL=/django/graphql/
ARG VITE_NODE_API_URL=/node/api/v1
ARG VITE_NODE_GRAPHQL_URL=/node/graphql
ARG VITE_NODE_SOCKET_URL=

ENV VITE_DJANGO_API_URL=${VITE_DJANGO_API_URL} \
    VITE_DJANGO_GRAPHQL_URL=${VITE_DJANGO_GRAPHQL_URL} \
    VITE_NODE_API_URL=${VITE_NODE_API_URL} \
    VITE_NODE_GRAPHQL_URL=${VITE_NODE_GRAPHQL_URL} \
    VITE_NODE_SOCKET_URL=${VITE_NODE_SOCKET_URL}

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

RUN chown -R node:node /app
USER node

COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

EXPOSE 5173

CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]

