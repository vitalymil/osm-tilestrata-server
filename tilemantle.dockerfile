FROM node

RUN npm install tilemantle -g

ENTRYPOINT ["tilemantle"]