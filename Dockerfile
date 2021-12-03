FROM node:16-alpine

RUN apk --update --no-cache add git git-lfs jq openssh

COPY package.json /

RUN npm i -g $( jq -j '.dependencies|to_entries|map("\(.key)@\(.value) ")|.[]' /package.json )

COPY release.config.js /usr/local/lib/

RUN apk add --update make \
  && rm -rf /var/cache/apk/* \
  && rm -rf /package.json

ENTRYPOINT ["npx"]

CMD ["semantic-release", "--extends", "/usr/local/lib/release.config.js"]
