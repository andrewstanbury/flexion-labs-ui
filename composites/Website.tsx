import { useId, type ComponentProps, type ReactNode } from 'react';
import { Image, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, radius, space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Pressable } from '../primitives/Pressable';
import { Text } from '../primitives/Text';
import { IconTile } from './IconTile';

// The flexionlabs.com visual language, as app components (v0.36.0): photo
// heroes under a deep-sage wash, striped placeholder art that carries a brief
// for the real image, an accent eyebrow over a big heading, feature cards with
// icon tiles, and the soft pink callout. react-native-svg and
// expo-linear-gradient are loaded on first use, never at import (see
// PanelCarousel's note on native modules and index.ts); without them these
// fall back to flat colour.

type Svg = typeof import('react-native-svg');
type Gradient = typeof import('expo-linear-gradient');
let svgModule: Svg | null | undefined;
let gradientModule: Gradient | null | undefined;
function loadSvg(): Svg | null {
  if (svgModule === undefined) {
    try {
      svgModule = require('react-native-svg') as Svg;
    } catch {
      svgModule = null;
    }
  }
  return svgModule;
}
function loadGradient(): Gradient | null {
  if (gradientModule === undefined) {
    try {
      gradientModule = require('expo-linear-gradient') as Gradient;
    } catch {
      gradientModule = null;
    }
  }
  return gradientModule;
}

type IoniconName = ComponentProps<typeof Ionicons>['name'];
export type ArtTone = 'sage' | 'sand' | 'blossom' | 'deep';

const TONES: Record<ArtTone, [string, string]> = {
  sage: [colors.sage[200], colors.sage[500]],
  sand: [colors.sand[100], colors.sand[400]],
  blossom: [colors.blossom[100], colors.blossom[500]],
  deep: [colors.sage[600], colors.sage[900]],
};

// ── ArtPlaceholder ────────────────────────────────────────────────────────
// Stands in for a photo or illustration until real artwork exists, in the
// website's style: a tonal gradient with fine diagonal stripes and a caption
// chip saying what the real image should show. `brief` is the art direction.
export type ArtPlaceholderProps = {
  kind?: 'photo' | 'illustration';
  brief: string;
  tone?: ArtTone;
  aspectRatio?: number;
  /** No caption — for backgrounds with content on top. */
  bare?: boolean;
  rounded?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function ArtPlaceholder({
  kind = 'photo',
  brief,
  tone = 'sage',
  aspectRatio,
  bare = false,
  rounded = true,
  style,
  children,
}: ArtPlaceholderProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const svg = loadSvg();
  const [from, to] = TONES[tone];
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${kind} placeholder: ${brief}`}
      style={[
        {
          aspectRatio,
          overflow: 'hidden',
          borderRadius: rounded ? radius.card : 0,
          backgroundColor: to,
          justifyContent: 'flex-end',
        },
        style,
      ]}
    >
      {svg ? (
        <svg.Svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
          <svg.Defs>
            <svg.LinearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
              <svg.Stop offset="0" stopColor={from} />
              <svg.Stop offset="1" stopColor={to} />
            </svg.LinearGradient>
            <svg.Pattern
              id={`s${id}`}
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-45)"
            >
              <svg.Rect width="2" height="14" fill="#FFFFFF" opacity={0.12} />
            </svg.Pattern>
          </svg.Defs>
          <svg.Rect width="100%" height="100%" fill={`url(#g${id})`} />
          <svg.Rect width="100%" height="100%" fill={`url(#s${id})`} />
        </svg.Svg>
      ) : null}
      {children}
      {!bare ? (
        <View
          style={{
            margin: space[3],
            alignSelf: 'flex-start',
            maxWidth: '90%',
            flexDirection: 'row',
            gap: space[2],
            paddingHorizontal: space[3],
            paddingVertical: space[2],
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.84)',
          }}
        >
          <Ionicons
            name={kind === 'photo' ? 'image-outline' : 'color-palette-outline'}
            size={14}
            color={colors.sage[600]}
          />
          <View style={{ flexShrink: 1 }}>
            <Text variant="label" style={{ color: colors.sage[700], textTransform: 'uppercase' }}>
              {kind}
            </Text>
            <Text variant="caption" style={{ color: colors.sand[700] }}>
              {brief}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ── HeroBanner ────────────────────────────────────────────────────────────
// The website hero: a photo (or placeholder art) under a deep-sage wash that
// darkens toward the text, an optional glass eyebrow pill, a big white
// heading, a subtitle and actions. `right` sits top-right (an Awards/Invite
// pill). Full-bleed: put it at the top of a screen with no side padding.
export type HeroBannerProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  image?: ImageSourcePropType;
  /** Placeholder art brief, used when there is no image yet. */
  imageBrief?: string;
  right?: ReactNode;
  children?: ReactNode;
  minHeight?: number;
  /** Space above the content, e.g. the safe-area top inset. */
  topInset?: number;
  style?: StyleProp<ViewStyle>;
};

export function HeroBanner({
  title,
  subtitle,
  eyebrow,
  image,
  imageBrief = 'Person exercising at home in warm daylight',
  right,
  children,
  minHeight = 220,
  topInset = 0,
  style,
}: HeroBannerProps) {
  const gradient = loadGradient();
  const wash = ['rgba(20,30,23,0.82)', 'rgba(20,30,23,0.55)', 'rgba(20,30,23,0.25)'] as const;
  return (
    <View
      style={[
        {
          minHeight,
          overflow: 'hidden',
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          backgroundColor: colors.sage[900],
        },
        style,
      ]}
    >
      {image ? (
        <Image source={image} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      ) : (
        <ArtPlaceholder
          brief={imageBrief}
          tone="deep"
          bare
          rounded={false}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}
      {gradient ? (
        <gradient.LinearGradient
          pointerEvents="none"
          colors={wash}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: wash[1] }} />
      )}
      <View style={{ paddingHorizontal: layout.screenX, paddingTop: topInset + space[5], paddingBottom: space[8], gap: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space[3] }}>
          {eyebrow ? (
            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: space[3],
                paddingVertical: 6,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.28)',
                backgroundColor: 'rgba(255,255,255,0.14)',
              }}
            >
              <Text variant="captionStrong" style={{ color: colors.white }}>
                {eyebrow}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {right}
        </View>
        <Text variant="display" style={{ color: colors.white, fontSize: 32, lineHeight: 37, letterSpacing: -0.8 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" style={{ color: 'rgba(255,255,255,0.86)', fontSize: 16, lineHeight: 23 }}>
            {subtitle}
          </Text>
        ) : null}
        {children ? <View style={{ gap: space[3], marginTop: space[2] }}>{children}</View> : null}
      </View>
    </View>
  );
}

/** A pill for HeroBanner's `right` slot (Awards, Invite). */
export function HeroPill({ label, icon, onPress }: { label: string; icon?: IoniconName; onPress?: () => void }) {
  return (
    <Pressable.Scale onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: space[4],
          paddingVertical: space[2],
          borderRadius: radius.pill,
          backgroundColor: colors.blossom[300],
        }}
      >
        {icon ? <Ionicons name={icon} size={14} color={colors.blossom[800]} /> : null}
        <Text variant="captionStrong" style={{ color: colors.blossom[800] }}>
          {label}
        </Text>
      </View>
    </Pressable.Scale>
  );
}

// ── SectionTitle ──────────────────────────────────────────────────────────
// The website's section head: an accent uppercase eyebrow, a big bold
// heading, an optional lead line.
export function SectionTitle({
  eyebrow,
  title,
  lead,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: 'left' | 'center';
}) {
  const t = useTheme();
  return (
    <View style={{ gap: space[2], alignItems: align === 'center' ? 'center' : 'flex-start', marginBottom: space[4] }}>
      {eyebrow ? (
        <Text variant="label" align={align} style={{ color: t.accent, textTransform: 'uppercase', letterSpacing: 1.2 }}>
          {eyebrow}
        </Text>
      ) : null}
      <Text variant="h1" align={align} accessibilityRole="header" style={{ fontSize: 26, lineHeight: 31, letterSpacing: -0.6 }}>
        {title}
      </Text>
      {lead ? (
        <Text variant="body" color="secondary" align={align}>
          {lead}
        </Text>
      ) : null}
    </View>
  );
}

// ── FeatureCard ───────────────────────────────────────────────────────────
// The website's feature card: icon tile, title, body, on a soft card.
export function FeatureCard({
  icon,
  title,
  body,
  tone = 'accent',
  onPress,
}: {
  icon: IoniconName;
  title: string;
  body?: string;
  tone?: 'accent' | 'highlight';
  onPress?: () => void;
}) {
  const t = useTheme();
  const content = (
    <View
      style={{
        gap: space[3],
        padding: space[5],
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.surfaceElevated,
        shadowColor: colors.black,
        shadowOpacity: 0.06,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      }}
    >
      <IconTile name={icon} tone={tone} size="lg" />
      <Text variant="h3">{title}</Text>
      {body ? (
        <Text variant="body" color="secondary">
          {body}
        </Text>
      ) : null}
    </View>
  );
  return onPress ? (
    <Pressable.Scale onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      {content}
    </Pressable.Scale>
  ) : (
    content
  );
}

// ── CalloutCard ───────────────────────────────────────────────────────────
// The website's pink "Are you a practitioner?" callout: icon disc, bold line,
// supporting text, an arrow when it is tappable.
export function CalloutCard({
  icon,
  title,
  body,
  onPress,
}: {
  icon: IoniconName;
  title: string;
  body?: string;
  onPress?: () => void;
}) {
  const t = useTheme();
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[4],
        padding: space[4],
        borderRadius: radius.card,
        backgroundColor: t.highlightSurface,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: t.surfaceElevated,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={20} color={t.highlightOn} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        {body ? <Text variant="caption" style={{ color: t.highlightOn }}>{body}</Text> : null}
      </View>
      {onPress ? <Ionicons name="arrow-forward" size={18} color={t.highlightOn} /> : null}
    </View>
  );
  return onPress ? (
    <Pressable.Scale onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      {content}
    </Pressable.Scale>
  ) : (
    content
  );
}
