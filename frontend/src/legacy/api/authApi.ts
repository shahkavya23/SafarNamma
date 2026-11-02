import type { User } from '../types';

// Mock users database
const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Kavya Shah',
    email: 'kavya@example.com',
    role: 'user',
    created_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 'a1',
    name: 'Admin RoamLocal',
    email: 'admin@roamlocal.in',
    role: 'admin',
    created_at: '2023-01-01T00:00:00Z'
  }
];

export const authApi = {
  login: async (email: string, password: string):Promise<{ user: User, token: string }> => {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network
    
    // In a real app, backend checks password. For mock, we just check email.
    const user = MOCK_USERS.find(u => u.email === email);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (password !== 'password123') { // Simple mock password for everyone
      throw new Error('Invalid email or password');
    }

    return {
      user,
      token: `mock_jwt_token_for_${user.id}`
    };
  },

  register: async (name: string, email: string, password: string): Promise<{ user: User, token: string }> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (MOCK_USERS.some(u => u.email === email)) {
      throw new Error('Email already registered');
    }

    const newUser: User = {
      id: `u${Date.now()}`,
      name,
      email,
      role: 'user',
      created_at: new Date().toISOString()
    };

    return {
      user: newUser,
      token: `mock_jwt_token_for_${newUser.id}`
    };
  }
};
