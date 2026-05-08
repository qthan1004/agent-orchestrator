import notifier from 'node-notifier';

export function notifyStuck(uuid: string, durationMs: number) {
  const durationStr = `${Math.round(durationMs / 60000)}m`;
  notifier.notify({
    title: 'AG Session Stuck',
    message: `Session ${uuid.slice(0, 8)} no activity for ${durationStr}`,
    actions: ['Open AG', 'Dismiss'],
    wait: true,
  });
}

export function notifyRecoveryReady(sessionData: any) {
  notifier.notify({
    title: 'AG Ready to Resume',
    message: 'Resume prompt copied to clipboard. Open new AG chat and paste.',
    wait: true,
  });
}
