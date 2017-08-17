FROM node:8.4.0
WORKDIR /usr/src/app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 2121
CMD ["node", "src/app.js"]
