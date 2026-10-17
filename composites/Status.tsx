import { Fragment, type ComponentProps, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { layout, radius, space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Text } from '../primitives/Text';

// Status and progress pieces from the retaskable kit (v0.31.0): notices,
// meters, stat tiles and the small "where is this up to" lines.

type IoniconName = ComponentProps<typeof Ionicons>['name'];
export type StatusTone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger';

function useTone(tone: StatusTone | 'muted') {
  const t = useTheme();
  switch (tone) {
    case 'neutral': return { fg: t.textPrimary, bg: t.surfaceMuted };
    case 'muted':   return { fg: t.textMuted, bg: t.surfaceMuted };
    case 'accent':  return { fg: t.accentStrong, bg: t.accentMuted };
    case 'info':    return { fg: t.info, bg: t.infoMuted };
    case 'success': return { fg: t.success, bg: t.successMuted };
    case 'warning': return { fg: t.warning, bg: t.warningMuted };
    case 'danger':  return { fg: t.danger, bg: t.dangerMuted };
  }
}

const BANNER_ICON: Record<StatusTone, IoniconName> = {
  neutral: 'information-circle-outline',
  accent: 'sparkles-outline',
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
  warning: 'warning-outline',
  danger: 'alert-circle-outline',
};

// Banner — a notice. `top` is a full-width strip under the header ("Offline —
// showing saved data"); `inline` is a tinted rounded notice with a coloured
// left edge and icon, inside the content. Either can carry one action.
export type BannerProps = {
  children: ReactNode;
  tone?: StatusTone;
  placement?: 'top' | 'inline';
  action?: ReactNode;
  icon?: IoniconName | null;
  style?: StyleProp<ViewStyle>;
};

export function Banner({ children, tone = 'neutral', placement = 'top', action, icon, style }: BannerProps) {
  const t = useTheme();
  const c = useTone(tone);
  const inline = placement === 'inline';
  const glyph = icon === null ? null : icon ?? (inline ? BANNER_ICON[tone] : null);
  const content =
    typeof children === 'string' ? (
      <Text variant="body" style={{ color: inline ? t.textPrimary : t.textPrimary, flexShrink: 1 }}>
        {children}
      </Text>
    ) : (
      children
    );
  return (
    <View
      accessibilityRole={tone === 'danger' || tone === 'warning' ? 'alert' : undefined}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: layout.gapMd,
          paddingHorizontal: layout.card,
          paddingVertical: space[3],
          backgroundColor: inline ? c.bg : t.surfaceMuted,
        },
        inline
          ? { borderRadius: radius.lg, borderWidth: 1, borderColor: c.bg, borderLeftWidth: 4, borderLeftColor: c.fg }
          : { borderBottomWidth: 1, borderBottomColor: t.border },
        style,
      ]}
    >
      {glyph ? <Ionicons name={glyph} size={20} color={c.fg} /> : null}
      <View style={{ flex: 1 }}>{content}</View>
      {action}
    </View>
  );
}

// Meter — a progress bar. Simple (`value` 0–1), segmented (`segments`, for
// counts like "4 of 10 sessions"), or stacked (`parts`, with an optional
// legend). `title`/`detail` sit above, `note` below.
export type MeterPart = { value: number; tone: StatusTone | 'muted'; name?: string };

export type MeterProps = {
  value?: number;
  tone?: StatusTone;
  segments?: number;
  parts?: readonly MeterPart[];
  title?: string;
  detail?: string;
  note?: string;
  legend?: boolean;
  label?: string;
};

export function Meter({ value = 0, tone = 'accent', segments, parts, title, detail, note, legend, label }: MeterProps) {
  const t = useTheme();
  const c = useTone(tone);
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const track = t.border;
  const height = 5;
  let bar: ReactNode;
  if (parts && parts.length) {
    bar = (
      <View style={{ flexDirection: 'row', height, borderRadius: height, overflow: 'hidden', backgroundColor: track }}>
        {parts.map((p, i) => (
          <PartFill key={i} part={p} clamp={clamp} />
        ))}
      </View>
    );
  } else if (segments && segments > 1) {
    const filled = Math.round(clamp(value) * segments);
    bar = (
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: segments }, (_, i) => (
          <View key={i} style={{ flex: 1, height, borderRadius: height, backgroundColor: i < filled ? c.fg : track }} />
        ))}
      </View>
    );
  } else {
    bar = (
      <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
        <View style={{ width: `${clamp(value) * 100}%`, height, backgroundColor: c.fg }} />
      </View>
    );
  }
  return (
    <View
      style={{ gap: space[1] }}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? title}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp(value) * 100) }}
    >
      {title || detail ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[2] }}>
          {title ? <Text variant="bodyStrong">{title}</Text> : <View />}
          {detail ? (
            <Text variant="caption" color="secondary" tabular>
              {detail}
            </Text>
          ) : null}
        </View>
      ) : null}
      {bar}
      {note ? (
        <Text variant="caption" color="muted">
          {note}
        </Text>
      ) : null}
      {legend && parts ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: layout.gapMd }}>
          {parts.map((p, i) =>
            p.name ? <LegendKey key={i} part={p} /> : null,
          )}
        </View>
      ) : null}
    </View>
  );
}

function PartFill({ part, clamp }: { part: MeterPart; clamp: (v: number) => number }) {
  const c = useTone(part.tone);
  return <View style={{ width: `${clamp(part.value) * 100}%`, backgroundColor: c.fg }} />;
}

function LegendKey({ part }: { part: MeterPart }) {
  const c = useTone(part.tone);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c.fg }} />
      <Text variant="caption" color="secondary">
        {part.name}
      </Text>
    </View>
  );
}

// Tile — one headline number with a label ("Sessions this week · 12"). Lay
// several out with Grid.
export type TileProps = {
  label: string;
  value: string | number;
  detail?: string;
  tone?: StatusTone;
  icon?: IoniconName;
};

export function Tile({ label, value, detail, tone = 'neutral', icon }: TileProps) {
  const t = useTheme();
  const c = useTone(tone);
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${detail ? `, ${detail}` : ''}`}
      style={{
        flex: 1,
        gap: space[1],
        padding: layout.card,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.surfaceElevated,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
        {icon ? <Ionicons name={icon} size={14} color={t.textSecondary} /> : null}
        <Text variant="label" color="secondary" style={{ textTransform: 'uppercase' }} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text variant="h1" tabular style={{ color: tone === 'neutral' ? t.textPrimary : c.fg }}>
        {String(value)}
      </Text>
      {detail ? (
        <Text variant="caption" color="secondary">
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

// StateLine — "where is this up to" in one coloured line: a dot (or icon)
// and a short status ("Ready to review", "Due today").
export type StateLineProps = {
  text: string;
  tone?: StatusTone | 'muted';
  icon?: IoniconName;
  size?: 'sm' | 'md';
};

export function StateLine({ text, tone = 'accent', icon, size = 'sm' }: StateLineProps) {
  const c = useTone(tone);
  const md = size === 'md';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] + (md ? 2 : 0) }}>
      {icon ? (
        <Ionicons name={icon} size={md ? 20 : 15} color={c.fg} />
      ) : (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.fg }} />
      )}
      <Text variant={md ? 'bodyStrong' : 'captionStrong'} style={{ color: c.fg }}>
        {text}
      </Text>
    </View>
  );
}

// StepTrail — a short ordered path with the current step highlighted:
// "Warm up → Exercises → Cool down".
export function StepTrail({ steps, current }: { steps: readonly string[]; current: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] }}>
      {steps.map((step, i) => (
        <Fragment key={`${i}-${step}`}>
          {i > 0 ? <Ionicons name="arrow-forward" size={13} color={t.textMuted} /> : null}
          <Text
            variant={i === current ? 'bodyStrong' : 'body'}
            style={{ color: i === current ? t.accentStrong : i < current ? t.textSecondary : t.textMuted }}
            accessibilityState={{ selected: i === current }}
          >
            {step}
          </Text>
        </Fragment>
      ))}
    </View>
  );
}

// StageStrip — phases as bars with labels underneath: done is success,
// current is info, the rest are track. ("Week 1 · Week 2 · Week 3")
export type Stage = { label: string; stage: 'done' | 'current' | 'left' };

export function StageStrip({ stages }: { stages: readonly Stage[] }) {
  const t = useTheme();
  // Current is info-blue, not the accent: sage and success-green are too close
  // to tell "done" from "now" at a glance.
  const colorFor = (s: Stage['stage']) => (s === 'done' ? t.success : s === 'current' ? t.info : t.border);
  return (
    <View style={{ flexDirection: 'row', gap: space[1] }}>
      {stages.map((s, i) => (
        <View key={`${i}-${s.label}`} style={{ flex: 1, gap: space[1] }}>
          <View style={{ height: 4, borderRadius: 4, backgroundColor: colorFor(s.stage) }} />
          <Text
            variant={s.stage === 'left' ? 'caption' : 'captionStrong'}
            style={{ color: s.stage === 'left' ? t.textMuted : colorFor(s.stage) }}
            numberOfLines={1}
          >
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
