export type UserRole = 'admin' | 'compliance_officer' | 'auditor';

export function canRecordTest(role: UserRole): boolean {
  return true;
}

export function canEditSettings(role: UserRole): boolean {
  return true;
}

export function canViewAIAnalysis(role: UserRole): boolean {
  return true;
}
