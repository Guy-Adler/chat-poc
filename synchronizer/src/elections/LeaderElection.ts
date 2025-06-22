import EventEmitter from 'events';

export abstract class LeaderElection extends EventEmitter<{ gained: []; lost: []; extended: [] }> {
  start(): void {}
  async stop(): Promise<void> {}
  get isLeader(): boolean {
    return false;
  }
}
