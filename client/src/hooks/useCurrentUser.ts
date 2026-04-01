import { useAuth } from "./use-auth";

export interface CurrentUserState {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    role: 'admin' | 'compliance_officer' | 'auditor';
    organisationId: number | null;
    profileImageUrl: string | null;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useCurrentUser(): CurrentUserState {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (!user) {
    return { user: null, isAuthenticated: false, isLoading };
  }

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: (user.role as 'admin' | 'compliance_officer' | 'auditor') || 'admin',
      organisationId: user.organisationId,
      profileImageUrl: user.profileImageUrl,
    },
    isAuthenticated: true,
    isLoading,
  };
}
