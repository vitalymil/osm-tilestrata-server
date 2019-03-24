FROM ubuntu:16.04

RUN apt-get clean
RUN apt-get update

RUN apt-get install -y curl
RUN curl -L https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get install -y nodejs python python-pip

RUN npm install -g --unsafe carto millstone

RUN apt-get install -y fonts-noto-cjk fonts-noto-hinted fonts-noto-unhinted \
                       fonts-hanazono ttf-unifont fonts-dejavu-core

RUN apt-get install -y wget
RUN wget https://github.com/googlei18n/noto-fonts/raw/master/hinted/NotoSansArabicUI-Regular.ttf
RUN wget https://github.com/googlei18n/noto-fonts/raw/master/hinted/NotoSansArabicUI-Bold.ttf
RUN mv NotoSansArabicUI-Regular.ttf /usr/share/fonts/truetype/noto/NotoSansArabicUI-Regular.ttf
RUN mv NotoSansArabicUI-Bold.ttf /usr/share/fonts/truetype/noto/NotoSansArabicUI-Bold.ttf

RUN apt-get install -y git mapnik-utils

WORKDIR /server
COPY package.json .
COPY package-lock.json .
RUN npm install --unsafe
COPY index.js .

ENTRYPOINT [ "node", "/server/index.js" ]