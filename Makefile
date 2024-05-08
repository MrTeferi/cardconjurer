.PHONY: start stop

start:
	docker build \
		--file Dockerfile \
		--target "prod" \
		--tag "cardconjurer-client" \
		. && \
	docker run \
		--detach \
		--hostname 127.0.0.1 \
		--publish 4242:4242 \
		--name cardconjurer-client \
		--volume ./:/usr/share/nginx/html/:ro \
		"cardconjurer-client"

stop:
	docker stop cardconjurer-client && \
	docker rm cardconjurer-client
