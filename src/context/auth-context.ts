import { createContext } from 'react';
import { User } from '../types';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (phone: string, pass: string) => Promise<void>;
  register: (name: string, phone: string, pass: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
