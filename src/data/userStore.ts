import { mockUsers } from './mockData';
import type { User } from '../types';

const REGISTERED_USERS_KEY = 'supportai_registered_users';
const ADMIN_CREATED_USERS_KEY = 'supportai_admin_created_users';

export function loadRegisteredUsers(): User[] {
  const saved = localStorage.getItem(REGISTERED_USERS_KEY);
  return saved ? JSON.parse(saved) : [];
}

export function saveRegisteredUsers(users: User[]) {
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}

export function loadAdminCreatedUsers(): User[] {
  const saved = localStorage.getItem(ADMIN_CREATED_USERS_KEY);
  return saved ? JSON.parse(saved) : [];
}

export function saveAdminCreatedUsers(users: User[]) {
  localStorage.setItem(ADMIN_CREATED_USERS_KEY, JSON.stringify(users));
}

export function getAllUsers(): User[] {
  return [...mockUsers, ...loadRegisteredUsers(), ...loadAdminCreatedUsers()];
}

export function emailExists(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return getAllUsers().some((user) => user.email.toLowerCase() === normalized);
}

export interface CreateAgentInput {
  name: string;
  email: string;
}

export function createAgentUser({ name, email }: CreateAgentInput): User {
  const newUser: User = {
    id: `u${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: 'agent',
    isAvailable: true,
  };

  const users = loadAdminCreatedUsers();
  users.push(newUser);
  saveAdminCreatedUsers(users);
  return newUser;
}
