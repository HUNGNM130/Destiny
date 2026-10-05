// Lưu token admin trong sessionStorage (mất khi đóng tab) và gắn vào các API admin.
const KEY = 'loveDiaryAdminToken';

export function setAdminToken(token: string) {
  try { sessionStorage.setItem(KEY, token); } catch { /* ignore */ }
}

export function getAdminToken(): string {
  try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; }
}

export function clearAdminToken() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

// Giống fetch, nhưng tự thêm header Authorization.
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = getAdminToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) clearAdminToken();
  return res;
}
