export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

export const getInstallPrompt = () => (typeof window !== 'undefined' ? window.__pwaPrompt || null : null);

export const subscribeInstallPrompt = (listener) => {
  if (typeof window === 'undefined') return () => {};
  const notify = () => listener(getInstallPrompt());
  window.addEventListener('pwa-prompt-ready', notify);
  notify();
  return () => window.removeEventListener('pwa-prompt-ready', notify);
};

export const triggerInstallPrompt = async () => {
  const promptEvent = getInstallPrompt();
  if (!promptEvent) return null;
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  window.__pwaPrompt = null;
  window.dispatchEvent(new Event('pwa-prompt-ready'));
  return choice;
};

