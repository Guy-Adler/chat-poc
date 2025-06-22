#!/bin/bash

set -euo pipefail

buildAndTag() {
  local service=$1

  if [[ -z "$service" ]]; then
    echo 'Invalid argument; need to provide $service';
    return 1
  fi

  echo "Starting to build $service..."
  docker build --quiet "$service" -t "chat-$service" > /dev/null
  echo "Finished building $service. Starting to push"
  docker tag "chat-$service" "localhost:32000/chat-$service" > /dev/null
  docker push "localhost:32000/chat-$service" > /dev/null
  echo "Finished pushing $service"
}

if [ "$#" -gt 0 ]; then
  services=("$@")  
else
  services=()
  while IFS= read -r service; do
    services+=("$service")
  done < <(find . -maxdepth 2 -name Dockerfile -type f -exec dirname {} \; | sed 's|^\./||')
fi

echo "Found the following services:"
echo "${services[@]}"

echo "Running build & push in parallel..."

for service in "${services[@]}"; do
  buildAndTag "$service" &
done

wait
echo "Finished building & pushing all services"