FROM node:14.15.1

RUN mkdir -p /usr/src/frontend
WORKDIR /usr/src/frontend

ADD service ./ 

RUN npm install

EXPOSE 5050
CMD ["npm","start"]
