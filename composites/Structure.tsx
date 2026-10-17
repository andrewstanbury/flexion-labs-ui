import { Children, useContext, useState, type ReactNode } from 'react';
import { Modal, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { layout, radius, space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Pressable } from '../primitives/Pressable';
import { Text } from '../primitives/Text';
import { IconButton } from './Controls';

// Layout and structure pieces from the retaskable kit (v0.31.0).

// Insets without the hard dependency on a provider: the usual insets hook
// throws outside <SafeAreaProvider>, which would make these unusable in tests
// and in any host that mounts them early. Zero insets is the right fallback.
function useBottomInset(): number {
  return useContext(SafeAreaInsetsContext)?.bottom ?? 0;
}

// Panel — a titled section on its own card: uppercase title, optional aside
// ("1 of 2 done") and a right-hand action. `highlight` draws a stronger
// border for the one panel that needs the user now.
export type PanelProps = {
  title: string;
  aside?: string;
  right?: ReactNode;
  tone?: 'plain' | 'highlight';
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Panel({ title, aside, right, tone = 'plain', children, style }: PanelProps) {
  const t = useTheme();
  const highlight = tone === 'highlight';
  return (
    <View
      style={[
        {
          gap: layout.gapMd,
          padding: layout.card,
          borderRadius: radius.xl,
          borderWidth: highlight ? 1.5 : 1,
          borderColor: highlight ? t.textPrimary : t.border,
          backgroundColor: highlight ? t.surfaceMuted : t.surfaceElevated,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Text variant="label" color="secondary" style={{ textTransform: 'uppercase' }} accessibilityRole="header">
          {title}
        </Text>
        {aside ? (
          <Text variant="caption" color="muted" style={{ flex: 1 }}>
            {aside}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {right}
      </View>
      {children}
    </View>
  );
}

// Properties — label/value pairs split by hairlines ("Frequency · Daily").
export type PropertyRow = { label: string; value: ReactNode };

export function Properties({ rows }: { rows: readonly PropertyRow[] }) {
  const t = useTheme();
  return (
    <View>
      {rows.map((row, i) => (
        <View
          key={row.label}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: layout.gapMd,
            paddingVertical: space[3],
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: t.border,
          }}
        >
          <Text variant="caption" color="secondary">
            {row.label}
          </Text>
          {typeof row.value === 'string' || typeof row.value === 'number' ? (
            <Text variant="bodyStrong">{String(row.value)}</Text>
          ) : (
            row.value
          )}
        </View>
      ))}
    </View>
  );
}

// Disclosure — a "show more" fold: chevron + label, content underneath.
export type DisclosureProps = {
  label: string;
  open?: boolean;
  children: ReactNode;
};

export function Disclosure({ label, open: initiallyOpen = false, children }: DisclosureProps) {
  const t = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={{ gap: space[2] }}>
      <Pressable.Touch
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space[1], paddingVertical: space[1] }}
      >
        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color={t.textSecondary} />
        <Text variant="body" color="secondary">
          {label}
        </Text>
      </Pressable.Touch>
      {open ? <View>{children}</View> : null}
    </View>
  );
}

// MoreMenu — the "…" overflow. Opens a sheet of actions from the bottom;
// `danger` items are red and sit last.
export type MoreMenuItem = { label: string; onPress: () => void; danger?: boolean };

export function MoreMenu({ label, items }: { label: string; items: readonly MoreMenuItem[] }) {
  const t = useTheme();
  const bottomInset = useBottomInset();
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton icon="ellipsis-horizontal" label={label} onPress={() => setOpen(true)} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable.Touch
          onPress={() => setOpen(false)}
          accessibilityLabel="Close menu"
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}
        >
          <View
            style={{
              margin: space[3],
              marginBottom: Math.max(bottomInset, space[3]),
              borderRadius: radius.xl,
              backgroundColor: t.surfaceElevated,
              overflow: 'hidden',
            }}
          >
            {items.map((item, i) => (
              <Pressable.Touch
                key={item.label}
                onPress={() => {
                  setOpen(false);
                  item.onPress();
                }}
                accessibilityRole="menuitem"
                style={{
                  paddingVertical: space[4],
                  paddingHorizontal: layout.card,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: t.border,
                }}
              >
                <Text variant="bodyStrong" color={item.danger ? 'danger' : 'primary'} align="center">
                  {item.label}
                </Text>
              </Pressable.Touch>
            ))}
          </View>
        </Pressable.Touch>
      </Modal>
    </>
  );
}

// ChatBubble — one message with a small uppercase sender label. `question`
// (the user) sits right; `answer` sits left.
export type ChatBubbleProps = {
  side: 'question' | 'answer';
  label?: string;
  children: ReactNode;
};

export function ChatBubble({ side, label, children }: ChatBubbleProps) {
  const t = useTheme();
  const mine = side === 'question';
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: space[1] }}>
      {label ? (
        <Text variant="label" color="muted" style={{ textTransform: 'uppercase' }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          maxWidth: '85%',
          paddingHorizontal: space[3],
          paddingVertical: space[2],
          borderRadius: radius.lg,
          backgroundColor: mine ? t.accentSurface : t.surfaceMuted,
          ...(mine ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 }),
        }}
      >
        {typeof children === 'string' ? (
          <Text variant="body" style={{ color: mine ? t.accentOn : t.textPrimary }}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

// BottomBar — the pinned strip at the bottom of a screen holding its main
// action. Respects the home-indicator inset.
export function BottomBar({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const bottomInset = useBottomInset();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: layout.gapMd,
          paddingHorizontal: layout.screenX,
          paddingTop: space[3],
          paddingBottom: Math.max(bottomInset, space[3]),
          borderTopWidth: 1,
          borderTopColor: t.border,
          backgroundColor: t.surface,
        },
        style,
      ]}
    >
      {Children.map(children, (child) => (
        <View style={{ flex: 1 }}>{child}</View>
      ))}
    </View>
  );
}

// Grid — equal columns that wrap ("three stat tiles across").
export function Grid({ columns, gap = layout.gapMd, children }: { columns: number; gap?: number; children: ReactNode }) {
  const cells = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < cells.length; i += columns) rows.push(cells.slice(i, i + columns));
  return (
    <View style={{ gap }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap }}>
          {row.map((cell, c) => (
            <View key={c} style={{ flex: 1 }}>
              {cell}
            </View>
          ))}
          {Array.from({ length: columns - row.length }, (_, k) => (
            <View key={`pad-${k}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

