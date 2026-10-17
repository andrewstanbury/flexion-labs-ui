// Importing the package must not load expo-audio: index.ts re-exports
// PanelCarousel, so a top-level import would put the native module on the
// import path of every screen in both apps (and break their jest runs, which
// do not mock it).
describe('PanelCarousel and expo-audio', () => {
  it('imports the package without touching expo-audio', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-audio', () => {
        throw new Error('expo-audio loaded at import time');
      });
      expect(() => require('../../index')).not.toThrow();
    });
  });
});
