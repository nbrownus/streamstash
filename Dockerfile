FROM node:4-onbuild

COPY package.json /src/package.json
RUN cd /src; npm install

COPY . /src

EXPOSE 9200
EXPOSE 9300
EXPOSE 5514

# Make sure to replace relp_container.js with your own config.js here - or edit this one.
CMD ["/src/bin/streamstash","/src/examples/relp_container.js"]
