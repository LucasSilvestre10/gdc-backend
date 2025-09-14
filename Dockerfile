###############################################################################
###############################################################################
##                      _______ _____ ______ _____                           ##
##                     |__   __/ ____|  ____|  __ \                          ##
##                        | | | (___ | |__  | |  | |                         ##
##                        | |  \___ \|  __| | |  | |                         ##
##                        | |  ____) | |____| |__| |                         ##
##                        |_| |_____/|______|_____/                          ##
##                                                                           ##
## description     : Dockerfile for TsED Application                         ##
## author          : TsED team                                               ##
## date            : 2023-12-11                                              ##
## version         : 3.0                                                     ##
##                                                                           ##
###############################################################################
###############################################################################

ARG NODE_VERSION=24.7.0

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /opt

COPY package.json package-lock.json tsconfig.json tsconfig.base.json tsconfig.node.json tsconfig.spec.json .barrels.json .swcrc ./

RUN npm ci

COPY ./src ./src

# Copia scripts auxiliares necessários para corrigir imports no dist
COPY ./tools ./tools

RUN npm run build-and-fix

FROM node:${NODE_VERSION}-alpine AS runtime
ENV WORKDIR /opt
WORKDIR $WORKDIR

# tini helps with proper signal forwarding and PID 1 issues
RUN apk update && apk add --no-cache tini ca-certificates

COPY --from=build /opt .

RUN npm ci --omit=dev --ignore-scripts

COPY . .

EXPOSE 8081
ENV PORT 8081
ENV NODE_ENV production

# Use tini as entrypoint and start the app in production mode using swc runtime
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
