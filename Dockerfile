# ----------------------------------------------------------------------
# 1. BUILD STAGE: Install dependencies and compile TypeScript
# ----------------------------------------------------------------------
# Use the official Node 22 Alpine image for a small, secure build environment.
FROM node:22-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Install Alpine's git and python3 (necessary for some Node native dependencies)
RUN apk add --no-cache git python3 make g++

# Copy package.json and package-lock.json first to leverage Docker layer caching.
# If these files haven't changed, Docker won't re-run npm install.
COPY package*.json ./

# Install project dependencies.
# --only=production ensures devDependencies are skipped, but we install them here
# because we need TypeScript compiler and testing tools for the build process.
RUN npm install

# Copy the rest of the NestJS application source code
COPY . .

# Run the NestJS build process (compiles TypeScript to JavaScript in the dist folder)
RUN npm run build

# ----------------------------------------------------------------------
# 2. PRODUCTION STAGE: Create the final minimal image for runtime
# ----------------------------------------------------------------------
# Start from a fresh, tiny Node 22 Alpine image (only runtime essentials)
FROM node:22-alpine AS runner

# Set environment variables for better performance and logging
ENV NODE_ENV production
ENV PORT 3000

# Set the working directory
WORKDIR /usr/src/app

# Copy only the necessary files for runtime from the builder stage:
# 1. The compiled JavaScript files ('dist')
# 2. The required production dependencies and package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .

# Expose the port on which the NestJS app runs (default is 3000)
EXPOSE ${PORT}

# Run the compiled application using the official Node executable
CMD ["node", "dist/main"]
