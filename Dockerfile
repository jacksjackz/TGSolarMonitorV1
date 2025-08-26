# Use official Node.js v22 (Alpine variant for smaller image)
FROM node:22-alpine

# Set the working directory in the container to /app
WORKDIR /app

# Copy package.json and package-lock.json into the container
COPY package*.json ./

# Install the application dependencies inside the container
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# port
EXPOSE 40555

# Set the command to run when the container starts
CMD [ "node", "app.js" ]