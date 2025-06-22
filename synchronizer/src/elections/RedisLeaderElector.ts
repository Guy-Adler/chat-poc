import { hostname } from 'os';
import { pool } from '../redis/connection';
import { LeaderElection } from './LeaderElection';

const MINIMUM_TTL = 2000;

export class RedisLeaderElector extends LeaderElection {
  //! Very important all pods participating in the election have the same env!
  private static readonly ELECTION_LOCK_KEY = process.env.ELECTION_LOCK_KEY!;
  private static instance: RedisLeaderElector;
  private readonly instanceId: string;
  private readonly ttl: number;
  private interval: NodeJS.Timeout | null = null;
  #isLeader = false;

  private constructor() {
    super();
    this.instanceId = hostname();
    this.ttl = +process.env.ELECTION_TTL!;
    if (Number.isNaN(this.ttl) || this.ttl < MINIMUM_TTL) {
      throw new Error(`Invalid ttl ${process.env.ELECTION_TTL}; Needs to be at least 1000 (ms)`);
    }
    if (!RedisLeaderElector.ELECTION_LOCK_KEY) {
      throw new Error(
        `Missing ELECTION_LOCK_KEY! All pods participating in the election have the same value`
      );
    }
  }

  static getInstance(): RedisLeaderElector {
    if (this.instance) return this.instance;
    this.instance = new RedisLeaderElector();
    return this.instance;
  }

  private async tryToAcquireLock() {
    try {
      const acquired = await pool.eval(
        `
        -- KEYS[1] = elections lock key
        -- ARGV[1] = client id
        -- ARGV[2] = lock TTL (in milliseconds)

        local lockKey = KEYS[1]
        local clientId = ARGV[1]
        local ttl = tonumber(ARGV[2])

        -- Try to acquire the lock (NX). If you end up getting it, set ttl.
        if redis.call('SET', lockKey, clientId, 'NX', 'PX', ttl) then
          return 1
        end

        -- If unable to acquire the lock, check if you already have it and extend it.
        if redis.call('GET', lockKey) == clientId then
          redis.call('PEXPIRE', lockKey, ttl)
          return 1
        end

        -- Lock wasn't acquired.
        return 0
      `,
        {
          keys: [RedisLeaderElector.ELECTION_LOCK_KEY],
          arguments: [this.instanceId, this.ttl.toString()],
        }
      );

      const previousIsLeader = this.isLeader;
      if (acquired) {
        this.#isLeader = true;
      } else {
        this.#isLeader = false;
      }

      if (this.isLeader !== previousIsLeader) {
        this.emit(this.isLeader ? 'gained' : 'lost');
      } else if (this.isLeader) {
        this.emit('extended');
      }
    } catch (error) {
      console.error(
        `[RedisLeaderElector] Error while trying to ${this.isLeader ? 'extend' : 'acquire'} lock`,
        error
      );
    }
  }

  private async releaseLock() {
    try {
      await pool.eval(
        `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        end
        return 0
      `,
        {
          keys: [RedisLeaderElector.ELECTION_LOCK_KEY],
          arguments: [this.instanceId],
        }
      );
    } catch (error) {
      console.error(`[RedisLeaderElector] Error while trying to release lock`, error);
    }
  }

  start(): void {
    this.interval = setInterval(() => this.tryToAcquireLock(), this.ttl / 2);
    this.tryToAcquireLock();
  }

  async stop(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    await this.releaseLock();
  }

  get isLeader(): boolean {
    return this.#isLeader;
  }
}
