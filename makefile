SHELL := /bin/bash

PROJECT_NAME := augment-social-backend-nestjs

SERVER := weknot
ARCHIVE_DIR := projects/archive

build:
	yarn install
	yarn build

zip: build
	echo "git: $(shell git branch --show-current) - $(shell git rev-parse HEAD)" | tee dist/version.txt
	echo "build: $(shell date)" | tee -a dist/version.txt
	zip -r ${PROJECT_NAME}.zip dist templates package.json yarn.lock

publish: zip
	scp ${PROJECT_NAME}.zip ${SERVER}:${ARCHIVE_DIR}
	rm ${PROJECT_NAME}.zip
	ssh ${SERVER} 'sh projects/deploy.sh ${PROJECT_NAME}'

start-mariadb:
	docker run -d \
		--name mariadb-${PROJECT_NAME} \
		-p 3306:3306 \
		-v mariadb-${PROJECT_NAME}-data:/var/lib/mysql \
		-e MARIADB_ROOT_PASSWORD=cai3hoocuoy0ohPheis4liid \
		mariadb:latest

start-postgres:
	docker run -d \
		--name postgres-${PROJECT_NAME} \
		-p 5432:5432 \
		-e POSTGRES_PASSWORD=cai3hoocuoy0ohPheis4liid \
		-e PGDATA-${PROJECT_NAME}=/var/lib/postgresql/data/pgdata \
		-v DATA-${PROJECT_NAME}:/var/lib/postgresql/data \
		postgres

start-mongo:
	docker run -d \
		--name mongodb-${PROJECT_NAME} \
		-p 27017:27017 \
		-e MONGO_INITDB_ROOT_USERNAME=admin \
		-e MONGO_INITDB_ROOT_PASSWORD=cai3hoocuoy0ohPheis4liid \
		-v mongodb-${PROJECT_NAME}-data:/data/db \
		mongo


start-redis:
	docker run -p 6379:6379 -d \
	-v $(shell pwd)/redis.conf:/usr/local/etc/redis/redis.conf \
	--name redis-${PROJECT_NAME} redis redis-server /usr/local/etc/redis/redis.conf