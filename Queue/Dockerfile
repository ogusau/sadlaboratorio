FROM node:14.15.1

RUN mkdir -p /usr/src/queue
WORKDIR /usr/src/queue

ADD service ./ 

RUN npm install

EXPOSE 9998
EXPOSE 9999
EXPOSE 9007
CMD ["npm","start"]
