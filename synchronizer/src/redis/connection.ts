import { createClientPool } from 'redis';

export const pool = createClientPool({
  socket: {
    host: process.env.REDIS_HOST!,
    port: +process.env.REDIS_PORT!,
  },
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
});

export const LAST_UPDATE_TIME_KEY = 'synchronizer:lastUpdateTime';

/**
 * @argument {string} KEYS[[1]: `LAST_UPDATE_TIME_KEY`
 * @argument {string} ARGV[[1]: last update time (unix epoch in ms).
 */
export const UPDATE_LAST_UPDATE_TIME_SCRIPT = `
local current = tonumber(redis.call('GET', KEYS[1]))
local incoming = tonumber(ARGV[1])

if not current or current <= incoming then
  return redis.call('SET', KEYS[1], ARGV[1])
end
return 0
`;
