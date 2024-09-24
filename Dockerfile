FROM node:alpine
COPY . /app
WORKDIR /app
CMD ["node", "build/App.js"]