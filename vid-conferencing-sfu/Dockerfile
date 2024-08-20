
FROM ubuntu:latest

RUN apt-get update && \
    apt-get install -y \
    build-essential \
    python3-pip \
    net-tools \
    iputils-ping \
    iproute2 \
    curl \
    && apt-get clean


RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

RUN npm install -g watchify


WORKDIR /app

COPY package*.json ./


RUN npm install

COPY src/ ./src
COPY src/ /app

COPY src/front-end/html/home.html /app
COPY src/front-end/html/room.html /app
COPY src/front-end/css/home_style.css /app
COPY src/front-end/css/room_style.css /app
COPY src/front-end/css/sign-in_style.css /app

COPY src/front-end/html/sign-in.html /app

COPY src/front-end/client-side-script/bundle.js /app
COPY src/front-end/client-side-script/client.js /app

COPY src/front-end/client-side-script/sign-in.js /app
COPY src/front-end/client-side-script/searchBar.js /app
COPY src/front-end/html/searchBar.html /app

COPY src/server/config/Mongooseconnection.js /app
COPY src/server/controllers/Authication.js /app
COPY src/server/controllers/UserAuth.js /app
COPY src/server/middleware/Middleware.js /app
COPY src/server/utils/generateToken.js /app

EXPOSE 3000
EXPOSE 2000-2050
EXPOSE 10000-10100

CMD [ "node", "src/server/server.js" ]
