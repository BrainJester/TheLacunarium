// Production backend identity comes from deployment configuration, never links.
export function readAppParams(browser, env) {
  if (!browser) return { appId: env.VITE_BASE44_APP_ID, appBaseUrl: env.VITE_BASE44_APP_BASE_URL };
  const params = new URLSearchParams(browser.location.search);
  const get = key => { try { return browser.localStorage.getItem(key); } catch { return null; } };
  const set = (key, value) => { try { if (value == null) browser.localStorage.removeItem(key); else browser.localStorage.setItem(key, value); } catch { /* unavailable storage */ } };
  set('base44_clear_access_token', null);
  if (params.get('clear_access_token') === 'true') { set('base44_access_token', null); set('token', null); }
  const incoming = params.get('access_token'); if (incoming) set('base44_access_token', incoming);
  for (const key of ['access_token', 'clear_access_token', 'app_id', 'app_base_url', 'functions_version', 'from_url']) params.delete(key);
  const search = params.toString(); browser.history.replaceState({}, '', browser.location.pathname + (search ? '?' + search : '') + browser.location.hash);
  return { appId: env.VITE_BASE44_APP_ID, token: get('base44_access_token') || get('token'), appBaseUrl: env.VITE_BASE44_APP_BASE_URL, functionsVersion: env.VITE_BASE44_FUNCTIONS_VERSION };
}
export const appParams = readAppParams(typeof window === 'undefined' ? null : window, import.meta.env || {});
