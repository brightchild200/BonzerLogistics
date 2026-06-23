/**
 * Helper to check if a user session contains a specific role.
 * Accounts for users having multiple roles.
 */
export const hasRole = (roles: string[] | null | undefined, role: string): boolean => {
  if (!roles || !Array.isArray(roles)) return false;
  return roles.includes(role);
};
