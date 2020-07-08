FROM nginx:mainline

LABEL maintainer="me@vinado.de"

RUN ( \
    echo "server {"; \
    echo "    listen       80;"; \
    echo "    #listen  [::]:80;"; \
    echo "    server_name  localhost;"; \
    echo ""; \
    echo "    location / {"; \
    echo "        root   /usr/share/nginx/html;"; \
    echo "        index  index.html index.htm;"; \
    echo ""; \
    echo "      # Configuration from https://serversforhackers.com/c/nginx-caching"; \
    echo "      # cache.appcache, your document html and data"; \
    echo "      location ~* \.(?:manifest|appcache|html?|xml|json)$ {"; \
    echo "        expires -1;"; \
    echo "        # access_log logs/static.log; # I don't usually include a static log"; \
    echo "      }"; \
    echo ""; \
    echo "      location ~* \.(?:rss|atom)$ {"; \
    echo "        expires 1h;"; \
    echo "        add_header Cache-Control \"public\";"; \
    echo "      }"; \
    echo ""; \
    echo "      # Media: images, icons, video, audio, HTC"; \
    echo "      location ~* \.(?:jpg|jpeg|gif|png|ico|webp|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc|otf|ttf|eot|woff|woff2)$ {"; \
    echo "        expires 30d;"; \
    echo "        access_log off;"; \
    echo "        add_header Cache-Control \"public\";"; \
    echo "      }"; \
    echo ""; \
    echo "      # CSS and Javascript"; \
    echo "      location ~* \.(?:css|js)$ {"; \
    echo "        expires 90d;"; \
    echo "        access_log off;"; \
    echo "        add_header Cache-Control \"public\";"; \
    echo "      }"; \
    echo "    }"; \
    echo ""; \
    echo "    error_page   500 502 503 504  /50x.html;"; \
    echo "    location = /50x.html {"; \
    echo "        root   /usr/share/nginx/html;"; \
    echo "    }"; \
    echo "}"; \
  ) >  /etc/nginx/conf.d/default.conf

COPY .    /usr/share/nginx/html
RUN mkdir /usr/share/nginx/html/ca
