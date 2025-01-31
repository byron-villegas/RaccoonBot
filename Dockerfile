# Use the official Node.js image as the base image
FROM node:21.7.3

# Update the package repository
RUN apt-get update

# Install the software-properties-common package
RUN apt install -y software-properties-common

# Add the yt-dlp repository
RUN add-apt-repository ppa:tomtomtom/yt-dlp

# Update the package repository
RUN apt-get update

# Install yt-dlp
RUN apt install -y yt-dlp  

# Install ffmpeg
RUN apt-get install -y ffmpeg

# Set the working directory
WORKDIR /app

# Copy the application
COPY . .

# Update yt-dlp
RUN yt-dlp -U

# Install dependencies
RUN npm install

# Expose the port the app runs on (if applicable)
EXPOSE 3000

# Define environment variables
ENV NODE_ENV=production

# Run the application
CMD ["node", "index.js"]