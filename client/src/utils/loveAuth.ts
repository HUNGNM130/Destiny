// Token "mật khẩu tình yêu" — lưu trong sessionStorage (mất khi đóng tab),
// tự gắn vào mọi request tới server qua header X-Love-Token.
const KEY = 'loveDiaryLoveToken';
const LOCK_EVENT = 'loveDiaryLocked';

export function getLoveToken(): string {
  try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; }
}
export function setLoveToken(token: string) {
  try { sessionStorage.setItem(KEY, token); } catch { /* ignore */ }
}
export function clearLoveToken() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

let installed = false;

// Bọc window.fetch một lần: thêm header token cho request cùng server,
// và nếu server báo cần mật khẩu (token hết hạn / đã đổi mật khẩu) thì quay về màn hình khoá.
export function installLoveFetch() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : '';
    const sameServer = url.startsWith('/') || url.startsWith(window.location.origin) || url.startsWith('http://localhost:3000');
    const token = getLoveToken();
    if (sameServer && token) {
      const headers = new Headers(init.headers || {});
      if (!headers.has('X-Love-Token')) headers.set('X-Love-Token', token);
      init = { ...init, headers };
    }
    const res = await original(input, init);
    if (res.status === 401 && res.headers.get('X-Love-Required')) {
      clearLoveToken();
      window.dispatchEvent(new Event(LOCK_EVENT));
    }
    return res;
  };
}

export const LOVE_LOCK_EVENT = LOCK_EVENT;
