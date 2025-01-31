# Use the official Node.js image as the base image
FROM node:21.7.3

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Set the working directory
WORKDIR /app

# Copy the application
COPY . .

# Install dependencies
RUN npm install

# Expose the port the app runs on (if applicable)
EXPOSE 3000

# Define environment variables
ENV NODE_ENV=production

# Run the application
CMD ["node", "index.js"]