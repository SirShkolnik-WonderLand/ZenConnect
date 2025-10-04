FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy Prisma schema and scripts
COPY prisma ./prisma/
COPY scripts ./scripts/
COPY tsconfig.json ./

# Install tsx for running TypeScript
RUN npm install -g tsx

# Generate Prisma client
RUN npx prisma generate

# Expose port for Prisma Studio (optional)
EXPOSE 5555

# Default command - can be overridden
CMD ["npm", "run", "migrate:deploy"]
