docker volume create mariadb_data
docker volume create mariadb_socker

# docker run --name mariadb -p 3306:3306 -e MARIADB_ROOT_PASSWORD="AQ,^]FeYjMt~i{t+H77z-ibla=C:R:" -d mariadb

docker run -d --name mariadb \
    -p 3306:3306 \
    -v mariadb_data:/var/lib/mysql \
    -v mariadb_socker:/var/run/mysqld \
    -e MARIADB_ROOT_PASSWORD="AQ,^]FeYjMt~i{t+H77z-ibla=C:R:" \
    mariadb