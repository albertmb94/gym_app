import type { AppData } from '../types';
import {
  fetchUserData,
  pushUserData,
  isServerAvailable,
  type SyncState,
} from './sync';

export interface SyncEngineOptions {
  username: string;
  getToken: () => string | null;
  getCurrentData: () => AppData;
  onState: (state: SyncState) => void;
  onRemotePulled: (remote: AppData, revision: number) => void;
  onConflict: (serverRevision: number, serverData: AppData | null) => void;
  onUnauthorized: () => void;
}

export class SyncEngine {
  private state: SyncState = { kind: 'idle' };
  private options: SyncEngineOptions;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private inflightPull: Promise<void> | null = null;
  private inflightPush: Promise<void> | null = null;
  private pendingPush = false;
  private lastPushedSlice: string = '';
  private serverRevision = 0;
  private lastServerUpdatedAt = 0;
  private isPulled = false;
  private stopped = false;

  constructor(options: SyncEngineOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    this.stopped = false;
    if (!(await isServerAvailable())) {
      this.setState({ kind: 'offline' });
      return;
    }
    await this.pull();
  }

  stop(): void {
    this.stopped = true;
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
    }
  }

  markDirty(): void {
    if (this.stopped) return;
    if (!this.isPulled) {
      return;
    }
    if (this.state.kind === 'offline') return;
    this.schedulePush();
  }

  async refreshFromNetwork(): Promise<void> {
    await this.pull();
  }

  getCurrentRevision(): number {
    return this.serverRevision;
  }

  getLastServerUpdatedAt(): number {
    return this.lastServerUpdatedAt;
  }

  isReady(): boolean {
    return this.isPulled;
  }

  private setState(state: SyncState): void {
    this.state = state;
    this.options.onState(state);
  }

  private async pull(): Promise<void> {
    if (this.inflightPull) return this.inflightPull;
    const token = this.options.getToken();
    if (!token) {
      this.setState({ kind: 'idle' });
      return;
    }
    this.setState({ kind: 'pulling' });
    this.inflightPull = (async () => {
      const result = await fetchUserData(this.options.username, token);
      if (this.stopped) return;
      if (!result.ok) {
        if (result.kind === 'unauthorized') {
          this.options.onUnauthorized();
          this.setState({ kind: 'error', reason: 'unauthorized' });
        } else if (result.kind === 'notFound') {
          this.serverRevision = 0;
          this.isPulled = true;
          this.setState({ kind: 'synced', revision: 0, updatedAt: 0 });
        } else if (result.kind === 'offline') {
          this.setState({ kind: 'offline' });
        } else {
          this.setState({ kind: 'error', reason: result.message });
        }
        return;
      }
      const remoteRevision = result.data.revision;
      this.serverRevision = remoteRevision;
      this.lastServerUpdatedAt = result.data.updatedAt;
      this.isPulled = true;
      this.options.onRemotePulled(result.data.data, remoteRevision);
      this.setState({ kind: 'synced', revision: remoteRevision, updatedAt: result.data.updatedAt });
      this.lastPushedSlice = JSON.stringify(this.sliceForUser(result.data.data));
    })();
    try {
      await this.inflightPull;
    } finally {
      this.inflightPull = null;
    }
  }

  private schedulePush(): void {
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      void this.push();
    }, 800);
  }

  private async push(): Promise<void> {
    if (!this.isPulled) return;
    if (this.inflightPush) {
      this.pendingPush = true;
      return;
    }
    const token = this.options.getToken();
    if (!token) return;

    const currentData = this.options.getCurrentData();
    const slice = JSON.stringify(this.sliceForUser(currentData));
    if (slice === this.lastPushedSlice) return;

    this.inflightPush = (async () => {
      this.setState({ kind: 'pushing', queued: false });
      const result = await pushUserData(this.options.username, token, currentData, this.serverRevision);
      if (this.stopped) return;
      if (!result.ok) {
        if (result.kind === 'conflict') {
          this.serverRevision = result.serverRevision ?? this.serverRevision;
          this.lastServerUpdatedAt = result.serverUpdatedAt ?? this.lastServerUpdatedAt;
          this.options.onConflict(this.serverRevision, result.serverData ?? null);
          this.setState({
            kind: 'conflict',
            serverRevision: this.serverRevision,
            serverData: result.serverData ?? null,
            serverUpdatedAt: this.lastServerUpdatedAt,
          });
        } else if (result.kind === 'unauthorized') {
          this.options.onUnauthorized();
          this.setState({ kind: 'error', reason: 'unauthorized' });
        } else if (result.kind === 'offline') {
          this.setState({ kind: 'offline' });
        } else {
          this.setState({ kind: 'error', reason: result.message });
        }
        return;
      }
      this.serverRevision = result.data.revision;
      this.lastServerUpdatedAt = result.data.updatedAt;
      this.lastPushedSlice = slice;
      this.setState({ kind: 'synced', revision: result.data.revision, updatedAt: result.data.updatedAt });
    })();
    try {
      await this.inflightPush;
    } finally {
      this.inflightPush = null;
      if (this.pendingPush && !this.stopped) {
        this.pendingPush = false;
        this.schedulePush();
      }
    }
  }

  private sliceForUser(data: AppData): unknown {
    const username = this.options.username;
    return {
      users: { [username]: data.users[username] },
      sessions: { [username]: data.sessions[username] || [] },
      cardioSessions: { [username]: data.cardioSessions?.[username] || [] },
      revision: data.revision,
    };
  }
}

export function mergeServerData(
  local: AppData,
  username: string,
  remote: AppData,
): AppData {
  const remoteUser = remote.users[username];
  const remoteSessions = remote.sessions[username] || [];
  const remoteCardio = remote.cardioSessions?.[username] || [];
  if (!remoteUser) return local;
  const localSessions = local.sessions[username] || [];
  const localCardio = local.cardioSessions?.[username] || [];

  const sessionMap = new Map<string, unknown>();
  for (const s of localSessions) sessionMap.set(s.id, s);
  for (const s of remoteSessions) sessionMap.set(s.id, s);

  const cardioMap = new Map<string, unknown>();
  for (const s of localCardio) cardioMap.set(s.id, s);
  for (const s of remoteCardio) cardioMap.set(s.id, s);

  return {
    ...local,
    users: { ...local.users, [username]: remoteUser },
    sessions: { ...local.sessions, [username]: Array.from(sessionMap.values()) as typeof localSessions },
    cardioSessions: {
      ...(local.cardioSessions || {}),
      [username]: Array.from(cardioMap.values()) as typeof localCardio,
    },
    revision: remote.revision ?? local.revision,
  };
}