/* Stable passwordless links. No credentials are bundled in this file. */
(() => {
  'use strict';
  const sessionKey = 'noga-workouts:' + location.pathname + ':access';
  const persistentKey = 'noga-workouts:pwa-access';
  let activeToken = '';

  const readSession = key => { try { return sessionStorage.getItem(key) || ''; } catch (_) { return ''; } };
  const writeSession = (key, value) => { try { sessionStorage.setItem(key, value); } catch (_) {} };
  const readPersistent = () => { try { return localStorage.getItem(persistentKey) || ''; } catch (_) { return ''; } };
  const writePersistentOnce = token => {
    try {
      if (!localStorage.getItem(persistentKey)) localStorage.setItem(persistentKey, token);
    } catch (_) {}
  };

  function linkFor(token) {
    // The access key stays in the URL fragment, which is not sent to GitHub Pages.
    return location.origin + location.pathname + '#k=' + encodeURIComponent(token);
  }

  function explicitToken() {
    const query = new URLSearchParams(location.search);
    const fragment = new URLSearchParams(location.hash.slice(1));
    if (query.has('k')) return query.get('k') || '';
    if (fragment.has('k')) return fragment.get('k') || '';
    return null;
  }

  function tokenFromUrl() {
    const explicit = explicitToken();
    // An explicit personal link always wins. The first valid link used on a device
    // is also kept locally so an installed PWA can reopen without losing identity.
    const token = explicit !== null
      ? explicit.trim()
      : readSession(sessionKey) || readSession('workoutKey') || readPersistent();

    activeToken = token;
    if (token) {
      writeSession(sessionKey, token);
      if (explicit !== null) writePersistentOnce(token);
      try { sessionStorage.removeItem('workoutKey'); } catch (_) {}

      const url = new URL(location.href);
      url.searchParams.delete('k');
      url.hash = 'k=' + encodeURIComponent(token);
      try { history.replaceState(null, '', url.pathname + url.search + url.hash); } catch (_) {}
    }
    return token;
  }

  function showLinkTools(token) {
    const who = document.querySelector('#who');
    if (!who || document.querySelector('#copyPersonalLink')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'copyPersonalLink';
    button.className = 'small';
    button.style.marginTop = '6px';
    const label = '\u05d4\u05e2\u05ea\u05e7\u05ea \u05d4\u05e7\u05d9\u05e9\u05d5\u05e8 \u05d4\u05d0\u05d9\u05e9\u05d9';
    button.textContent = label;
    button.onclick = async () => {
      const link = linkFor(token);
      try {
        if (!navigator.clipboard?.writeText) throw new Error('clipboard_unavailable');
        await navigator.clipboard.writeText(link);
        button.textContent = '\u05d4\u05e7\u05d9\u05e9\u05d5\u05e8 \u05d4\u05d5\u05e2\u05ea\u05e7';
        setTimeout(() => { button.textContent = label; }, 2500);
      } catch (_) {
        prompt('\u05d4\u05e7\u05d9\u05e9\u05d5\u05e8 \u05d4\u05d0\u05d9\u05e9\u05d9 \u05e9\u05dc\u05da \u2014 \u05e9\u05de\u05e8\u05d9 \u05d0\u05d5\u05ea\u05d5 \u05dc\u05e2\u05e6\u05de\u05da:', link);
      }
    };
    who.append(document.createElement('br'), button);
  }

  // Pasting a different personal link into the same tab must not keep the old identity.
  addEventListener('hashchange', () => {
    const token = explicitToken();
    if (token !== null && token.trim() !== activeToken) location.reload();
  });

  window.WorkoutAccess = Object.freeze({tokenFromUrl, linkFor, showLinkTools});
})();
