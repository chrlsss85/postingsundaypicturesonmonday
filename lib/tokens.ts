import { v4 as uuidv4 } from 'uuid';

export function generateToken(): string {
  return uuidv4().replace(/-/g, '').substring(0, 16);
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20) + '-' + Math.random().toString(36).substring(2, 6);
}