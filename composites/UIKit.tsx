import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { layout, space, typography } from '../tokens';
import { useTheme } from '../UIProvider';
import { Button } from '../primitives/Button';
import { Card } from '../primitives/Card';
import { Text } from '../primitives/Text';
import { Badge, Tag } from './Tag';
import { FilterChips } from './FilterChips';
import { ListGroup } from './ListGroup';
import { IconTile } from './IconTile';
import { SectionHeader } from './SectionHeader';
import { SegmentedControl } from './SegmentedControl';
import { ToggleRow } from './ToggleRow';
import { EmptyState } from './EmptyState';
import { Checklist, Chip, Choice, IconButton, RadioOption } from './Controls';
import { Banner, Meter, StageStrip, StateLine, StepTrail, Tile } from './Status';
import { BottomBar, ChatBubble, Disclosure, Grid, MoreMenu, Panel, Properties } from './Structure';
import { NumberField, TextField } from './Fields';
import { AppearanceSection } from './AppearanceSection';
import { ArtPlaceholder, CalloutCard, FeatureCard, HeroBanner, HeroPill, SectionTitle } from './Website';

// UIKit — every design-system component on one scrolling page, with physio
// examples. Mount it on a dev-only route in either app to review the library
// on a device or in a web build; it is also the screenshot target when the
// look changes. Not for patients or clinicians to see.
const noop = () => {};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: layout.gapMd }}>
      <SectionHeader title={title} />
      {children}
    </View>
  );
}

const Row = ({ children }: { children: ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], alignItems: 'center' }}>{children}</View>
);

export function UIKit() {
  const t = useTheme();
  const [chip, setChip] = useState(true);
  const [filter, setFilter] = useState<'all' | 'due' | 'done'>('all');
  const [choice, setChoice] = useState<'morning' | 'evening'>('morning');
  const [radio, setRadio] = useState(0);
  const [steps, setSteps] = useState([
    { text: 'Warm up for 5 minutes', on: true },
    { text: 'Three sets of calf raises', on: false },
  ]);
  const [seg, setSeg] = useState<'light' | 'dark' | 'system'>('system');
  const [toggle, setToggle] = useState(true);
  const [name, setName] = useState('Sam Patel');
  const [reps, setReps] = useState<number | null>(12);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.surface }}
      contentContainerStyle={{ padding: layout.screenX, paddingBottom: space[16], gap: space[6], maxWidth: 720 }}
    >
      <View style={{ marginHorizontal: -layout.screenX, marginTop: -layout.screenX }}>
        <HeroBanner
          eyebrow="Your home exercise program"
          title="Recover with exercises you can actually follow."
          subtitle="Step-by-step guides, a narrator, and your progress in one place."
          right={<HeroPill label="Awards" icon="trophy-outline" onPress={noop} />}
        >
          <Button.Primary fullWidth={false}>Start today&apos;s session</Button.Primary>
        </HeroBanner>
      </View>
      <Text variant="display">UI kit</Text>

      <Section title="Website">
        <SectionTitle eyebrow="Features" title="Track your recovery journey" lead="Everything you need to do your exercises well." />
        <FeatureCard icon="list-outline" title="Step-by-step guides" body="Every exercise broken into clear illustrated steps." />
        <FeatureCard icon="volume-high-outline" tone="highlight" title="See it, hear it, do it" body="A narrator walks you through each step." />
        <CalloutCard icon="person-outline" title="Are you a practitioner?" body="Build programs and invite patients." onPress={noop} />
        <ArtPlaceholder brief="Patient doing a calf raise at home, side view" aspectRatio={16 / 10} />
        <ArtPlaceholder kind="illustration" tone="blossom" brief="Character flipping through exercise cards" aspectRatio={1} style={{ width: 140 }} />
      </Section>

      <Section title="Appearance">
        <Text variant="caption" color="secondary">
          Changes here apply to the whole app, as they would from Settings.
        </Text>
        <AppearanceSection />
      </Section>

      <Section title="Text">
        {(Object.keys(typography) as (keyof typeof typography)[]).map((v) => (
          <Text key={v} variant={v}>{`${v}: Heel slides, 3 × 10`}</Text>
        ))}
        <Row>
          {(['primary', 'secondary', 'muted', 'accent', 'danger', 'warning', 'success', 'info'] as const).map((c) => (
            <Text key={c} color={c}>{c}</Text>
          ))}
        </Row>
        <Text mono>mono: FLX-4821</Text>
        <Text italic>italic: as your physio described it</Text>
        <Text tabular>tabular: 01:30 12:05</Text>
        <Text align="center">align center</Text>
      </Section>

      <Section title="Buttons">
        <Row>
          <Button.Primary size="md" fullWidth={false}>Start session</Button.Primary>
          <Button.Secondary size="md" fullWidth={false}>Skip</Button.Secondary>
          <Button.Ghost size="md" fullWidth={false}>Not now</Button.Ghost>
          <Button.Destructive size="md" fullWidth={false}>Remove</Button.Destructive>
        </Row>
        <Row>
          <Button.Primary size="sm" fullWidth={false}>Assign</Button.Primary>
          <Button.Secondary size="sm" fullWidth={false}>Edit</Button.Secondary>
          <Button.Primary size="sm" fullWidth={false} disabled>Disabled</Button.Primary>
        </Row>
        <Button.Primary>Full width</Button.Primary>
        <Row>
          <Chip label="Favourites" icon="heart-outline" on={chip} onPress={() => setChip(!chip)} />
          <Chip label="Knee" on={false} onPress={noop} />
          <IconButton icon="chevron-back" label="Previous" onPress={noop} />
          <IconButton icon="chevron-forward" label="Next" onPress={noop} disabled />
          <IconButton icon="add" label="Add exercise" onPress={noop} filled />
          <MoreMenu
            label="More"
            items={[
              { label: 'Duplicate program', onPress: noop },
              { label: 'Delete program', onPress: noop, danger: true },
            ]}
          />
        </Row>
        <FilterChips
          chips={[
            { key: 'all', label: 'All', count: 8 },
            { key: 'due', label: 'Due today', count: 3 },
            { key: 'done', label: 'Done', count: 5 },
          ]}
          selected={filter}
          onSelect={setFilter}
        />
        <Row>
          <Choice label="Morning" hint="Reminder at 8:00" on={choice === 'morning'} onPress={() => setChoice('morning')} fullWidth={false} />
          <Choice label="Evening" hint="Reminder at 19:00" on={choice === 'evening'} onPress={() => setChoice('evening')} fullWidth={false} />
        </Row>
        <SegmentedControl
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
          value={seg}
          onChange={setSeg}
        />
      </Section>

      <Section title="Surfaces">
        <Card.Elevated><Text>Card elevated</Text></Card.Elevated>
        <Card.Plain><Text>Card plain</Text></Card.Plain>
        <Grid columns={3}>
          <Tile label="Sessions" value={12} detail="this week" tone="success" />
          <Tile label="Streak" value="5 days" icon="flame-outline" />
          <Tile label="Due" value={2} detail="oldest today" tone="accent" />
        </Grid>
        <Row>
          <IconTile name="walk-outline" />
          <IconTile name="body-outline" tone="highlight" />
          <IconTile name="fitness-outline" size="lg" />
        </Row>
      </Section>

      <Section title="Status">
        <Row>
          {(['neutral', 'accent', 'info', 'success', 'warning', 'danger'] as const).map((tone) => (
            <Badge key={tone} tone={tone}>{tone}</Badge>
          ))}
          <Badge icon="time-outline">Waiting since today</Badge>
        </Row>
        <Row>
          <Tag label="Plan" tone="highlight" />
          <Tag label="New" tone="accent" />
          <Tag label="Flag" tone="danger" />
        </Row>
        <Row>
          <StateLine text="Ready to review" />
          <StateLine text="In progress" tone="info" />
          <StateLine text="Overdue" tone="danger" />
          <StateLine text="Completed" tone="success" icon="checkmark-circle" />
        </Row>
        <StateLine size="md" text="Waiting for your feedback" icon="chatbubble-ellipses-outline" />
        {(['accent', 'info', 'success', 'warning', 'danger'] as const).map((tone) => (
          <Meter key={tone} value={0.6} tone={tone} />
        ))}
        <Meter value={0.4} segments={10} tone="info" title="This week" detail="4 of 10 sessions" note="Resets Monday" />
        <Meter
          title="Time per phase"
          legend
          parts={[
            { value: 0.5, tone: 'success', name: 'Exercising' },
            { value: 0.3, tone: 'warning', name: 'Resting' },
            { value: 0.2, tone: 'muted', name: 'Paused' },
          ]}
        />
        <StageStrip
          stages={[
            { label: 'Week 1', stage: 'done' },
            { label: 'Week 2 · now', stage: 'current' },
            { label: 'Week 3', stage: 'left' },
          ]}
        />
        <StepTrail steps={['Warm up', 'Exercises', 'Stretch', 'Done']} current={1} />
      </Section>

      <Section title="Notices">
        <Banner>Offline — showing your saved program</Banner>
        <Banner action={<Button.Ghost size="sm" fullWidth={false}>Leave</Button.Ghost>}>Preview · not saved</Banner>
        {(['info', 'success', 'warning', 'danger'] as const).map((tone) => (
          <Banner key={tone} tone={tone} placement="inline">{`An inline ${tone} notice.`}</Banner>
        ))}
        <Banner tone="danger" placement="inline" action={<Button.Secondary size="sm" fullWidth={false}>Try again</Button.Secondary>}>
          Couldn&apos;t save your session.
        </Banner>
        <EmptyState iconName="barbell-outline" heading="No exercises yet" body="Your physiotherapist hasn't assigned anything." />
      </Section>

      <Section title="Panels and lists">
        <Panel title="Today" aside={`${steps.filter((s) => s.on).length} of ${steps.length} done`} tone="highlight">
          <Checklist items={steps} onToggle={(i) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} />
        </Panel>
        <Panel title="Pain level" right={<Button.Secondary size="sm" fullWidth={false}>Why?</Button.Secondary>}>
          {['No pain', 'Mild', 'Moderate'].map((label, i) => (
            <RadioOption key={label} label={label} on={radio === i} onPress={() => setRadio(i)} />
          ))}
        </Panel>
        <Properties
          rows={[
            { label: 'Frequency', value: 'Daily' },
            { label: 'Duration', value: '20 minutes' },
            { label: 'Assigned by', value: <Badge>Dr Lee</Badge> },
          ]}
        />
        <ListGroup title="Needs review">
          <ListGroup.Row title="Calf raise" subtitle="Round 2" onPress={noop} />
          <ListGroup.Row title="Heel slides" selected onPress={noop} />
          <ListGroup.Row title="Wall slides" trailing={<Badge tone="danger">Flagged</Badge>} />
          <ListGroup.Row
            title="Quad sets"
            subtitle="New narration"
            lead={<StateLine text="Ready to review" />}
            foot={<Badge icon="time-outline">Waiting since today</Badge>}
            onPress={noop}
          />
        </ListGroup>
        <Disclosure label="How to do it (4 steps)">
          <Text variant="caption" color="secondary">Sit tall, straighten the knee, hold for five seconds.</Text>
        </Disclosure>
        <ChatBubble side="question" label="You">Knee replacement, week 3, twenty minutes.</ChatBubble>
        <ChatBubble side="answer" label="Assistant">Here is a draft with five exercises.</ChatBubble>
      </Section>

      <Section title="Fields">
        <TextField label="Name" hint="As it appears to your physiotherapist" value={name} onChange={setName} />
        <NumberField label="Reps" value={reps} onChange={setReps} />
        <TextField label="Email" value="sam@" onChange={noop} error="That isn't an email address." />
        <ToggleRow title="Daily reminder" subtitle="At 8:00" value={toggle} onValueChange={setToggle} />
        <ToggleRow title="Encrypted backups" subtitle="Always on" value locked />
      </Section>

      <BottomBar>
        <Button.Secondary>Save draft</Button.Secondary>
        <Button.Primary>Assign</Button.Primary>
      </BottomBar>
    </ScrollView>
  );
}
