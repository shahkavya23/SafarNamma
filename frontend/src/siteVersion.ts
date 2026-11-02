// Admins get the redesigned site; everyone else keeps the current one (src/legacy).
// When the redesign goes public: delete src/legacy, drop this switch in main.tsx,
// and set ITINERARIES_ADMIN_ONLY = False in backend/main.py.

const adminEmails = (): string[] => {
  const envAdmins = import.meta.env.VITE_ADMIN_EMAILS
    ? (import.meta.env.VITE_ADMIN_EMAILS as string).split(',').map((e: string) => e.trim().toLowerCase())
    : [];
  return ['admin@roamlocal.in', ...envAdmins];
};

const readStoredEmail = (): string | undefined => {
  try {
    const stored = localStorage.getItem('roamlocal_user');
    return stored ? (JSON.parse(stored) as { email?: string }).email : undefined;
  } catch {
    return undefined;
  }
};

export const shouldUseNewSite = (): boolean => {
  const email = readStoredEmail();
  return !!email && adminEmails().includes(email.trim().toLowerCase());
};

const loadedNewSite = shouldUseNewSite();

// Call after login/logout: if the signed-in user now belongs on the other site, reload into it.
// Deferred so the caller's navigate() runs first and the reload lands on the right page.
export const reloadIfSiteChanged = () => {
  if (shouldUseNewSite() !== loadedNewSite) setTimeout(() => window.location.reload(), 0);
};
