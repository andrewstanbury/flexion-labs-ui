import { pendingBadge, syncSpins, syncStatus, syncWords } from '../syncStatus';

describe('syncStatus', () => {
  it('gives each state its own icon and tone', () => {
    expect(syncStatus('saved', 0)).toMatchObject({ icon: 'cloud-done-outline', tone: 'ok', label: 'All changes saved' });
    expect(syncStatus('syncing', 3)).toMatchObject({ icon: 'sync-outline', tone: 'busy', label: 'Syncing 3 changes' });
    expect(syncStatus('offline', 0)).toMatchObject({ icon: 'cloud-offline-outline', tone: 'warn', label: 'Offline' });
  });

  it('counts the waiting changes offline, singular and plural', () => {
    expect(syncWords('offline', 1).detail).toBe("1 change saved on this phone. It sends when you're back online.");
    expect(syncWords('offline', 4).detail).toBe("4 changes saved on this phone. They send when you're back online.");
  });

  it('says plain Syncing with nothing counted', () => {
    expect(syncWords('syncing', 0).label).toBe('Syncing');
  });

  it("uses the app's own words when given", () => {
    const view = syncStatus('saved', 0, () => ({ label: 'Tout est enregistré', detail: 'd' }));
    expect(view).toMatchObject({ label: 'Tout est enregistré', detail: 'd', icon: 'cloud-done-outline' });
  });
});

describe('syncSpins', () => {
  it('turns only while syncing, never with reduced motion', () => {
    expect(syncSpins('syncing', false)).toBe(true);
    expect(syncSpins('syncing', true)).toBe(false);
    expect(syncSpins('saved', false)).toBe(false);
    expect(syncSpins('offline', false)).toBe(false);
  });
});

describe('pendingBadge', () => {
  it('is hidden at zero and capped at 99+', () => {
    expect(pendingBadge(0)).toBeNull();
    expect(pendingBadge(-1)).toBeNull();
    expect(pendingBadge(7)).toBe('7');
    expect(pendingBadge(120)).toBe('99+');
  });
});
