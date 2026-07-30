// Public surface of the shared design system. App code should only import from
// `@flexion-labs/ui` — never from individual files inside this package.

export * from './tokens';
export * from './UIProvider';

// Utils
export * from './lib/formatBytes';
export * from './lib/describeBackend';
export * from './lib/appLockLogic';
export * from './lib/secureKeyValueStorage';

// Hooks
export * from './hooks/useThemeStore';
export * from './hooks/useIsDark';
export * from './hooks/useIsWide';
export * from './hooks/useSidebarStore';
export * from './hooks/useTabBarPadding';
export * from './hooks/useAudioMixingStore';
export * from './hooks/useDevModeStore';
export * from './hooks/useHaptic';
export * from './hooks/useToastStore';
// Offline/media primitives (lifted from the apps' duplicated subsystem)
export * from './hooks/mediaFiles';
export * from './hooks/mediaFileName';
export * from './hooks/mediaCache';
export * from './hooks/mediaApi';
export * from './hooks/downloadMedia';
export * from './hooks/useMediaUri';
export * from './hooks/prefetchPolicy';
export * from './hooks/useDownloadProgress';
export * from './hooks/useDownloadLedger';

// Primitives
export * from './primitives/Pressable';
export * from './primitives/Text';
export * from './primitives/Button';
export * from './primitives/Input';
export * from './primitives/Card';
export * from './primitives/Icon';
export * from './primitives/Screen';
export * from './primitives/Stack';

// Composites
export * from './composites/FormField';
export * from './composites/SectionHeader';
export * from './composites/ListItem';
export * from './composites/SegmentedControl';
export * from './composites/ListPicker';
export * from './composites/ToggleRow';
export * from './composites/EmptyState';
export * from './composites/StatusScreen';
export * from './composites/AuthScreenShell';
export * from './composites/StorageBar';
export * from './composites/OfflineBanner';
export * from './composites/SyncStatusDot';
export * from './composites/SyncStatusBar';
export * from './composites/SyncStatusShell';
export * from './composites/ToastViewport';

// Shell
export * from './shell/TabBar';
export * from './shell/Sidebar';
export * from './shell/Header';
export * from './shell/BackButton';
export * from './shell/Modal';
export * from './shell/KeyboardScreen';
