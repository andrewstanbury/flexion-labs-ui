import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import { ListItem } from '../ListItem';
import { UIProvider } from '../../UIProvider';
import { radius } from '../../tokens';

// Covers the grouped list-row model added in v0.19.0.
//
// The interesting cases are all about a row not being able to see its own
// position or container. Each of these was a real way to get it wrong:
//
// - a row keeping its own surface/radius inside a group -> rounded corners
//   nested in rounded corners, and a doubled edge at every seam
// - separators drawn as a per-row top border -> a stray line above the first row
// - a conditionally-rendered row -> a separator with nothing under it
// - grouping leaking out of the provider -> standalone rows losing their card
//
// None of these throw. They all just look wrong on a device, which is exactly
// the kind of thing worth pinning in a test rather than re-checking by eye.

function renderIn(ui: React.ReactElement) {
  return render(<UIProvider scheme="light">{ui}</UIProvider>);
}

function flatStyle(node: { props: { style?: unknown } }): Record<string, unknown> {
  const s = node.props.style;
  const parts = Array.isArray(s) ? s.flat(Infinity) : [s];
  return Object.assign({}, ...parts.filter((p) => p && typeof p === 'object'));
}

describe('ListItem — standalone (default, unchanged)', () => {
  it('keeps its own card surface, radius and minimum height', () => {
    const { UNSAFE_getAllByType } = renderIn(<ListItem.Plain title="Alone" />);
    const style = flatStyle(UNSAFE_getAllByType(View)[0]);
    expect(style.borderRadius).toBe(radius.card);
    expect(style.minHeight).toBe(56);
    expect(style.backgroundColor).not.toBe('transparent');
  });
});

describe('ListItem.Group — grouped rows', () => {
  it('strips per-row surface, radius and minHeight so the container owns them', () => {
    const { UNSAFE_getAllByType } = renderIn(
      <ListItem.Group>
        <ListItem.Plain title="One" />
      </ListItem.Group>
    );
    // First View is the group container; the row is inside it.
    const views = UNSAFE_getAllByType(View);
    const row = views.map(flatStyle).find((s) => s.backgroundColor === 'transparent');
    expect(row).toBeDefined();
    expect(row!.borderRadius).toBe(0);
    expect(row!.minHeight).toBeUndefined();
  });

  it('clips its children, so square rows cannot paint over the rounded corners', () => {
    const { UNSAFE_getAllByType } = renderIn(
      <ListItem.Group>
        <ListItem.Plain title="One" />
      </ListItem.Group>
    );
    const container = flatStyle(UNSAFE_getAllByType(View)[0]);
    expect(container.overflow).toBe('hidden');
    expect(container.borderRadius).toBe(radius.card);
    expect(container.borderWidth).toBe(1);
  });

  it('draws n-1 separators — none above the first row', () => {
    const { UNSAFE_getAllByType } = renderIn(
      <ListItem.Group>
        <ListItem.Plain title="One" />
        <ListItem.Plain title="Two" />
        <ListItem.Plain title="Three" />
      </ListItem.Group>
    );
    const hairlines = UNSAFE_getAllByType(View).map(flatStyle).filter((s) => s.height === 1);
    expect(hairlines).toHaveLength(2);
  });

  it('does not strand a separator when a row is conditionally absent', () => {
    const canDelete = false;
    const { UNSAFE_getAllByType } = renderIn(
      <ListItem.Group>
        <ListItem.Plain title="One" />
        {canDelete && <ListItem.Destructive title="Delete" />}
      </ListItem.Group>
    );
    // One real row -> zero separators, not one dangling above nothing.
    const hairlines = UNSAFE_getAllByType(View).map(flatStyle).filter((s) => s.height === 1);
    expect(hairlines).toHaveLength(0);
  });

  it('does not leak grouping to rows outside it', () => {
    const { UNSAFE_getAllByType } = renderIn(
      <>
        <ListItem.Group>
          <ListItem.Plain title="Inside" />
        </ListItem.Group>
        <ListItem.Plain title="Outside" />
      </>
    );
    const standalone = UNSAFE_getAllByType(View).map(flatStyle).filter((s) => s.minHeight === 56);
    expect(standalone).toHaveLength(1);
  });
});
