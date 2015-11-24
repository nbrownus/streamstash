FROM node:4-onbuild

COPY package.json /src/package.json
RUN cd /src; npm install

COPY . /src

EXPOSE 9200
EXPOSE 9300
EXPOSE 5514

# Make sure to replace relp_basic.js with your own config.js here
CMD ["/src/bin/streamstash","/src/examples/relp_basic.js"]