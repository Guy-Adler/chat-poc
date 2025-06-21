#!/bin/bash

set -euo pipefail

rollout() {
  local service=$1

  if [[ -z "$service" ]]; then
    echo 'Invalid argument; need to provide $service';
    return 1
  fi

  local resource=$(yq ea 'select(.spec.template.spec.containers[].image == "localhost:32000/chat-'"$service"':latest") | .kind + "/" + .metadata.name' ./deployment/**/*.*)

  if [[ -z "$resource" ]]; then
    echo 'Could not find any resource to rollout';
    return 0
  fi

  kubectl rollout restart $resource
  kubectl rollout status $resource --watch
}

services=()
while IFS= read -r service; do
  services+=("$service")
done < <(find . -maxdepth 2 -name Dockerfile -type f -exec dirname {} \; | sed 's|^\./||')

echo "Found the following services:"
echo "$services"

echo "Restarting the rollout of the containers..."

for service in "${services[@]}"; do
  rollout "$service" &
done

wait
echo "Finished rolling out all services"