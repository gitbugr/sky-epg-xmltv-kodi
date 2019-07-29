FROM node:latest

COPY package.json .
COPY package-lock.json .
COPY src .
COPY run.sh .

RUN npm install
