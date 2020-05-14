# use the latest LTS node version + security fix only alpine version
ARG NODE_VERSION=12.16-alpine3.10

FROM node:${NODE_VERSION} AS builder

RUN mkdir -p /opt/app
WORKDIR /opt/app

ADD package.json package-lock.json /opt/app/
RUN npm install

ADD . /opt/app/
RUN npm run format
RUN npm run lint
RUN npm run build


FROM node:${NODE_VERSION}

ENV NODE_ENV production

RUN apk add gnupg

ADD package.json package-lock.json /opt/app/
RUN cd /opt/app && npm install

COPY --from=builder /opt/app/dist/index.js /opt/app/dist/

COPY hack/scripts/entrypoint.sh /opt/app/entrypoint.sh
ENTRYPOINT ["/opt/app/entrypoint.sh"]
