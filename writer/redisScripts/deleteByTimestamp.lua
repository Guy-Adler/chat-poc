-- KEYS[1] = hash key
-- KEYS[2] = chat index key
-- ARGV[1] = message id
-- ARGV[2] = timestamp of update

local hashKey = KEYS[1]
local indexKey = KEYS[2]
local messageId = ARGV[1]
local timestamp = ARGV[2]

if redis.call('EXISTS', hashKey) == 0 then
  return -1
end

local currentTimestamp = redis.call('HGET', hashKey, "updatedAt")

if (not timestamp) or (not currentTimestamp) or (timestamp >= currentTimestamp) then
  redis.call('DEL', hashKey)
  redis.call('SREM', indexKey, messageId)
  return 1
end

return 0
