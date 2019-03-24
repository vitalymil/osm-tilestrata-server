FROM node

RUN npm install tilestrata-balancer -g

ENTRYPOINT ["tilestrata-balancer"]