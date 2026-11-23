# Tabimate art notes

How the code-drawn placeholder sprites look, and why. The rules for the
sprite pipeline itself (sheets, palettes, the meta.app redraw rule) are in
CLAUDE.md; this file is the art direction and each species' look.

## Direction

- **Cute.** A big head, a slim body (never a fat belly), a dark 2 x 2 eye
  with a glint, and a pink blush where it suits (`scripts/lib/placeholder/face.ts`).
- **Collectible.** Every species has something of its own (a mark, a shape,
  its colours), so each find feels new, not a recolour of its neighbour.
- **Bright** where the animal is (parrots), true to life where it isn't.
- Preview a contact sheet of every species before regenerating, and keep
  every frame inside 24 x 24 with a free pixel all round (a test checks).

## How a look is built

`npm run art:placeholders` draws each archetype from a body plan
(`scripts/lib/placeholder/plans.ts`, a registry). Hand-tuned plans colour
every pixel themselves instead of the generic lit-top shading; each slot
means something per plan, and a species' palette in `public/data/palettes.json`
(colours from the master palette) turns the slots into its colours. Species
that share a shape share an archetype and differ by palette.

The accent is usually the species' colour mark; a look that uses it for
something other than pink skips the blush.

## Looks by family

### Penguins (`penguin.ts`)

Stand and waddle on the ground. Slots: back, beak and feet, white front,
marks, eye.

- great-penguin: emperor, king. Yellow or orange ear patch and throat, long beak.
- crested-penguin: macaroni, rockhopper. Yellow brow plumes, red eyes.
- brush-penguin: Adélie, gentoo, chinstrap, little, yellow-eyed. A mark round the eye.
- penguin: African, Humboldt, Galápagos. Face stripe, chest band, pink eye patch.

### Bears (`bear.ts`)

Slots: fur, far legs and belly, muzzle, pattern, eye; the nose is outline-dark.

- bear: brown, American black, polar. One fur, a lighter muzzle.
- panda: black legs, shoulder band, ears and eye patches on white.
- chest-mark-bear: Asian black, sun, sloth. A pale or orange chest V, a shoulder ruff.
- spectacled-bear: cream rings round the eyes running to the throat.

### Sharks (`shark.ts`, on `marine.ts`)

Cute and chunky: a big round head tapering to a forked tail, a large
swept-back dorsal, a smile over a pale lower jaw with only a thin pale belly
strip, spaced gill stripes, a blush.

- shark: great white, bull, mako, blue, nurse, Greenland.
- tiger-shark: stripes over the back.
- hammerhead: the hammer, an eye at its tip.
- filter-shark: whale shark (white spots), basking shark. A wide mouth at the front.

### Whales (`whale.ts`, on `marine.ts`)

Countershaded, flukes beating.

- rorqual: blue, fin, minke. Throat pleats.
- humpback-whale: long white flipper, knobbly head.
- right-whale: bowhead, right, gray. No dorsal, pale patches.
- orca: tall dorsal, white eye patch, grey saddle.
- sperm-whale: the square head, wrinkles.
- beluga: white, a round melon.
- narwhal: the tusk, a mottled back.

### Elephants (`elephant.ts`)

A curled, swinging trunk, pale toenails, a tufted tail.

- elephant: African. Huge ears, long curved tusks.
- forest-elephant: rounder ears, straight tusks, darker.
- asian-elephant: small ears, twin-domed head, arched back, pink freckles.

### Rabbits and hares (`rabbit.ts`)

Hopping, ears tilting back in the air, pink ear insides and nose.

- rabbit: European. White cottontail.
- pygmy-rabbit: tiny, short ears, no white tail.
- hare: European and Arctic. Long legs, long black-tipped ears.
- snowshoe-hare: big pale feet.

### Primates (`primate.ts`, looks in `apeLooks.ts` and `monkeyLooks.ts`)

Four stances: knuckle (apes: sloping back, long front arms), monkey (on all
fours, a tail), lemur (an arched tail), upright (gibbons, arms raised). Tails
are a registry (`primateTail.ts`).

- gorilla: silver saddle, crest.
- chimpanzee: big ears.
- orangutan: Bornean. Cheek pads, shaggy hair.
- sumatran-orangutan: Sumatran, Tapanuli. A pale beard.
- snow-monkey: Japanese macaque. Red face, snow on its head.
- macaque: rhesus. Orange rump.
- proboscis: droopy nose, pot belly.
- mandrill: red and blue muzzle.
- snub-nosed: golden mane, blue face.
- howler: golden mantle, beard, gripping tail.
- squirrel-monkey: white mask, black muzzle, yellow legs.
- tamarin: lion mane.
- ring-tailed-lemur: banded tail, eye mask.
- ruffed-lemur: black-and-white and red ruffed. A ruff, a dark muzzle.
- mouse-lemur: tiny, big ears.
- aye-aye: huge ears, a long finger.
- lar-gibbon: white hands.
- siamang: throat sac.

### Parrots (`parrot.ts`, looks in `parrotLooks.ts`)

Bright. Perched upright with a folded wing, or flying with a broad beating
wing; a chunky hooked beak.

- macaw: scarlet (white face, yellow wing band), hyacinth (cobalt, yellow eye ring).
- budgie: yellow face, cheek spot, barred wing.
- cockatiel: yellow crest and face, orange cheek.
- cockatoo: sulphur-crested. Yellow crest.
- kea: orange underwing, seen as it flaps.
- lorikeet: rainbow. Blue head, orange chest and beak.
- grey-parrot: African grey. Red tail, pale face.
- kakapo: flightless, moss green, an owl-like face disc.
