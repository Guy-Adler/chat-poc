# Chat POC

## Goals

The project will consist of the following microservices, enabling the flow we want to mimic:

- [x] `external`: Simulates the external service which we do not control (front + backend)
- [x] `synchronizer`: Imitates the external service's client, reading messages and saving them to Kafka.
- [x] `writer`: Writes messages from Kafka to a database
- [x] `internal`: Imitates our system (front + back)

## Requirements

- Everything (except external, we don't care about that) should be scalable (we need HA).
- Everything should be geographically redundant (can be imitated with 2 postgres with replication, 2 Kafka clusters with mirrormaker, etc.)
- Latency should be relatively low

## Running locally in Kubernetes:

- Install [Docker](https://docs.docker.com/get-started/get-docker/)
- Install and start [microk8s](https://microk8s.io/docs/getting-started)
- In bash, run the following to build the images:

```sh
$ chmod +x ./build-images.sh
$ ./build-images.sh
```

- Run the following to install everything on the cluster:

```sh
# Create the required namespaces
$ mircok8s kubectl apply -f ./deployment/namespaces.yaml
# Install all services
$ microk8s kubectl apply -Rf ./deployment/
```

- The external app should be available on [`http://localhost:30001`](http://localhost:30001)
- The internal app should be available on [`http://localhost:30002`](http://localhost:30002)
- KafkaUI should be available on [`http://localhost:30080`](http://localhost:30080)

## Encountered problems & their solutions:

### Problem: messages might never be deleted from redis.

**Solution**: Add a 24 hours (86400 seconds) TTL to messages & chat indexes

### Problem: not deleting only the latest version from redis

**Solution**: Add a `deletedByTimestamp` lua script that only deletes from cache if the timestamp is >= current timestamp in cache.

### Problem: sending update to client regardless of whether the message really has been updated

**Solution**: Modify the `updateByTimestamp` lua script to return `-1` if the key wasn't found, `0` if there is a newer value in Redis, and `1` if there was an update.

### Problem: need to use persistent groups for reading messages (just using Date makes us read old messages and send wong data to client)

**Solution**: Move `internal` from a `Deployment` to a `StatefulSet`, guaranteeing a known set of unique pod names.

### Problem: internal can send kafka message when there is a newer one already in db

**Solution**: ?????

### Problem: client might get update messages before the load message

**Solution**: Out of scope for this POC. Can be handled by saving the `update` messages in the client and only rendring them after the `load` message is received and processed.
