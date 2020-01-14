FROM nginx:mainline

LABEL maintainer="Vincent Nadoll <me@vinado.de>"

RUN apt-get -y update && apt-get install -y \
    openssl \
 && rm -rf /var/lib/apt/lists/*

COPY .  /usr/share/nginx/html
WORKDIR /usr/share/nginx/html

RUN openssl x509 -outform der -in cacert.pem -out cacert.crt
