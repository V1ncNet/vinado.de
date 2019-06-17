FROM nginx:mainline

LABEL maintainer="Vincent Nadoll <me@vinado.de>"

COPY . /usr/share/nginx/html
