# Dockerfile
FROM php:8.2-fpm

WORKDIR /var/www

# تثبيت الامتدادات المطلوبة
RUN apt-get update && apt-get install -y \
    libonig-dev \
    libzip-dev \
    unzip \
    git \
    curl \
    && docker-php-ext-install pdo_mysql mbstring zip exif pcntl bcmath

COPY . /var/www

RUN chown -R www-data:www-data /var/www

CMD ["php-fpm"]
