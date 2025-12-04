# 1. Start with a Python base image (easier to add Node to Python than vice versa)
FROM python:3.9-slim

# 2. Install system dependencies required for dlib/face_recognition
# 'cmake' and 'build-essential' are MANDATORY for dlib
RUN apt-get update && apt-get install -y \
    cmake \
    build-essential \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 3. Install Node.js (Version 18)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# 4. Set the working directory
WORKDIR /app

# 5. Copy your project files into the container
COPY . .

# 6. Install Python Dependencies
# (Make sure requirements.txt is inside the 'python' folder)
RUN pip install --no-cache-dir -r python/requirements.txt

# 7. Install Backend Node Dependencies
WORKDIR /app/backend
RUN npm install

# 8. Expose the backend port (Change 5000 if your server uses a different port)
EXPOSE 5000

# 9. Start the Server
# Ensure 'index.js' or 'server.js' is the correct entry file name
CMD ["node", "index.js"]