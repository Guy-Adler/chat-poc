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
