export interface User {
  id: number;
  name: string;
  role: 'admin' | 'compliance_officer' | 'auditor';
}

export interface CurrentUserState {
  user: User;
  isAuthenticated: boolean;
}

export function useCurrentUser(): CurrentUserState {
  return {
    user: {
      id: 1,
      name: 'Admin',
      role: 'admin',
    },
    isAuthenticated: true,
  };
}
