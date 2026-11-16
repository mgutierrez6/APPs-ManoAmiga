FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
# Carpeta de las fotos subidas (en producción es un volumen). Tiene que ser del usuario node.
RUN mkdir -p /app/uploads && chown node:node /app/uploads
# No corremos como root dentro del contenedor.
USER node
EXPOSE 3000
CMD ["node", "server.js"]
