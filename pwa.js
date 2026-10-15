(() => {
  'use strict';

  let deferredPrompt = null;
  const isStandalone = () =>
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  const isAndroid = () => /Android/i.test(navigator.userAgent || '');

  function notify() {
    window.dispatchEvent(new CustomEvent('workout-install-state', {
      detail: {
        canInstall: !!deferredPrompt,
        standalone: isStandalone(),
        android: isAndroid()
      }
    }));
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });

  window.WorkoutPWA = Object.freeze({
    isStandalone,
    isAndroid,
    canInstall: () => !!deferredPrompt,
    requestInstall: async () => {
      if (!deferredPrompt) return { prompted: false };
      const promptEvent = deferredPrompt;
      deferredPrompt = null;
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice.catch(() => ({ outcome: 'unknown' }));
      notify();
      return { prompted: true, outcome: choice?.outcome || 'unknown' };
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
      notify();
    });
  } else {
    queueMicrotask(notify);
  }
})();
