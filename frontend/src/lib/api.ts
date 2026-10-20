function getApiBaseUrl(): string {
  // In the browser, use relative path so Next.js proxies via rewrites (avoids CORS & network mismatches)
  if (typeof window !== 'undefined') {
    return '';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
}

export interface User {
  id: string;
  username: string;
  email: string;
  lifetimeWinnings: number;
  lifetimeLosses: number;
  createdAt: string;
}

export interface PlayerNetRecord {
  userId?: string;
  username: string;
  buyIn?: number;
  finalChips?: number;
  net: number;
}

export interface GameRecord {
  id: string;
  date: string;
  roomCode?: string | null;
  totalPot?: number | null;
  players: PlayerNetRecord[];
  createdAt: string;
}

export interface RoomPlayer {
  socketId: string;
  userId: string;
  username: string;
  isGameMaster: boolean;
  isReady: boolean;
  chips: number;
  joinedAt: number;
}

export interface TableConfig {
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
  maxPlayers: number;
}

export interface Room {
  code: string;
  name: string;
  gameMasterId: string;
  gameMasterUsername: string;
  players: RoomPlayer[];
  status: 'waiting' | 'in_progress' | 'settled';
  config: TableConfig;
  createdAt: number;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded';
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  database: {
    status: string;
    latencyMs: number | null;
  };
}

export interface StatsResponse {
  userCount: number;
  gameCount: number;
  topWinners: Array<User & { netProfit: number }>;
}

async function safeFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = `${getApiBaseUrl()}${endpoint}`;
  try {
    return await fetch(url, options);
  } catch (err: any) {
    console.error(`Network error requesting ${url}:`, err);
    throw new Error(
      'Unable to connect to the card room server. Please ensure the backend server is running.'
    );
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await safeFetch('/api/health', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchUsers(sort?: string): Promise<User[]> {
  const query = sort ? `?sort=${encodeURIComponent(sort)}` : '';
  const res = await safeFetch(`/api/users${query}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch users: ${res.statusText}`);
  }
  const data = await res.json();
  return data.users;
}

export async function fetchGames(): Promise<GameRecord[]> {
  const res = await safeFetch('/api/games', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch game records: ${res.statusText}`);
  }
  const data = await res.json();
  return data.games;
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await safeFetch('/api/stats', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch platform stats: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchActiveRooms(): Promise<Room[]> {
  const res = await safeFetch('/api/rooms', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch active tables');
  }
  const data = await res.json();
  return data.rooms;
}

export async function fetchRoom(code: string): Promise<Room> {
  const res = await safeFetch(`/api/rooms/${code.toUpperCase()}`, { cache: 'no-store' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Table "${code}" not found.`);
  }
  const data = await res.json();
  return data.room;
}

export async function createUser(payload: {
  username: string;
  email: string;
  password: string;
}): Promise<User> {
  const res = await safeFetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create user: ${res.statusText}`);
  }
  const data = await res.json();
  return data.user;
}

export async function loginUser(payload: {
  identifier: string;
  password: string;
}): Promise<User> {
  const res = await safeFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Invalid credentials');
  }
  const data = await res.json();
  return data.user;
}

export async function fetchMe(userId: string): Promise<User> {
  const res = await safeFetch(`/api/auth/me/${userId}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch session profile');
  }
  const data = await res.json();
  return data.user;
}
