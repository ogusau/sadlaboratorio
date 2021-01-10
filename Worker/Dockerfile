FROM node:14.15.1

RUN mkdir -p /usr/src/worker
WORKDIR /usr/src/worker

ADD service ./ 

RUN npm install

EXPOSE 5050
CMD ["npm","start"]
