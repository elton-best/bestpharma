FROM php:8.4-cli-alpine
RUN apk add --no-cache git unzip libzip-dev libpng-dev libjpeg-turbo-dev oniguruma-dev postgresql-dev sqlite-dev icu-dev $PHPIZE_DEPS \
    && docker-php-ext-configure gd --with-jpeg \
    && docker-php-ext-install pdo_pgsql pdo_sqlite mbstring zip gd bcmath sockets pcntl intl \
    && pecl install redis \
    && docker-php-ext-enable redis
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/backend
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000", "--no-reload"]
