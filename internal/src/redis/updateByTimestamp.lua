-- KEYS[1] = hash key
-- KEYS[2] = chat index key
-- ARGV[1] = message id
-- ARGV[2] = new timestamp (number)
-- ARGV[3] = field count (N)
-- ARGV[4...N*2+3] = alternating field/value pairs


local hashKey = KEYS[1]
local indexKey = KEYS[2]
local messageId = ARGV[1]
local newTimestamp = ARGV[2]
local fieldCount = tonumber(ARGV[3])

local currentTimestamp = redis.call('HGET', hashKey, "updatedAt")

if (not currentTimestamp) or (newTimestamp > currentTimestamp) then
  for i = 1, fieldCount do
    local field = ARGV[3 + (i * 2 - 1)]
    local value = ARGV[3 + (i * 2)]
    redis.call('HSET', hashKey, field, value)
  end
end

redis.call('SADD', indexKey, messageId)

return redis.call('HGETALL', hashKey)
