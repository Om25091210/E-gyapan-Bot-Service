FROM node:alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app's source code
COPY . .

# Compile TypeScript to JavaScript (if needed)
RUN npm run build

# Expose the port your app runs on
EXPOSE 5000

# Use CMD to specify the default startup command
CMD ["npm", "run", "dev"]
