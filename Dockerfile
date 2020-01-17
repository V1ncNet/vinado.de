FROM nginx:mainline

LABEL maintainer="me@vinado.de"

COPY .    /usr/share/nginx/html
RUN mkdir /usr/share/nginx/html/ca
VOLUME  ["/usr/share/nginx/html/ca"]
