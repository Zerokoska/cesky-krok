import type { Role } from './data/types';

/**
 * Internal logins behind the role buttons on the sign-in screen. Nobody types
 * them; the accounts are created once in the Supabase dashboard (.invalid never
 * receives mail, so no email is ever sent).
 */
export const ROLE_LOGIN: Record<Role, string> = {
  teacher: 'ucitel@cesky-krok.invalid',
  student: 'studentka@cesky-krok.invalid',
};
