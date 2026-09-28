# Use official Node.js v22 (Alpine variant for smaller image)
FROM node:22-alpine

# Set the working directory in the container to /app
WORKDIR /app

# Copy package.json and package-lock.json into the container
COPY package*.json ./

# Install the application dependencies inside the container
RUN npm ci --omit=dev

# Copy the rest of the application code into the container
COPY . .

# port
EXPOSE 40555

# Wait until Postgres accepts TCP connections, then start the app.
# `exec` replaces the shell so node runs as PID 1 and receives stop signals.
CMD [ "sh", "-c", "node wait-for-db.js && exec node app.js" ]