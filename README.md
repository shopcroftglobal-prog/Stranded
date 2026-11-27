# Stranded (steps 3 to 7: stars, waves and dragons)

Your ship came down hard. Pick a real world to crash on, dig, make tools, build the four missing parts and fly away.


## New: see your pilot dig

The camera now sits just over your pilot's right shoulder, so you watch them walk, swing their pickaxe or drill (it is in their hand) and fight. Each chop lands as the chips fly. The aim is still the cross in the middle of the screen, and you reach as far as before. Press **Y** (or **View** on phones) to look through your eyes instead; the game remembers your choice. Add `?eyes` to the link to start that way.

## New in steps 3 to 7

- **Star map** (ship panel after the ship is fixed): fly between the six worlds. Trips cost Fuel cells (4 ice + 1 purple crystal). The Moon and Europa need only the repaired engine. Proxima b needs the Strong engine (1 Dragon scale). TRAPPIST-1e and LHS 1140 b need the Star engine (2 Dragon scales) and the Bigger fuel tank. Your bag flies with you. A world unlocks once you have been there.
- **Waves**: the Wave beacon next to the ship. 50 waves per world in 5 stages (Landing, First night, Storm, Deep dark, Dragon). Waves 10, 20, 30, 40 bring a big creature. Wave 50 is that world's dragon: Dust, Crater, Ice, Red sun, Sea and Stone dragon, each with its own special move. Every wave gives coins and a chest; every stage gives a bigger prize.
- **Forge**: make it in the bag, place it, use it. Weapons Rock club, Iron sword, Crystal sword, Gold spear, Star blade (levels 1 to 5) and four shields. Each stage needs that level of weapon. You keep weapons on every world.
- **Health and air**: air runs down outside (faster on colder worlds and in storms) and fills near the ship or an Air maker. If you fall, your bag stays where you were (marked on screen) and you wake at your Bed or the ship.
- **Day and night** from real day lengths (Mars, Moon, Europa). Proxima b, TRAPPIST-1e and LHS 1140 b always face their star: no night. Dust or snow storms, and meteor showers on airless worlds.
- **Friendly finds**: Hopper, Rock crab, Glow jelly, Salt snail, Gold mole, Dust puff, Ice fish (rare golden one), Star moth (at night or in caves), Shiny beetle (in caves), Sky ray. Walk up to them for a reward. All go in the **Collection book** (B).
- **Buried wrecks** with Old supply boxes, the **Scanner** (Q), the **Trader** who lands by the ship now and then, **Buddy** the robot (after wave 20).
- **Free roam** (title screen or pause): no air loss, no night creatures, fly with G. **Castle bricks**, **Gold blocks**, **Spike traps** (hurt creatures that step on them).
- **Mining rigs**: place on the ground; they dig what is under them every 3 minutes, even when the game is closed, up to 200 finds. The first 2 rigs are free; more slots cost 250 coins each. "Welcome back" shows what they dug.
- **Rig treasures** (only rigs find these, never by mining, in chests or at the Trader): Star shard, Moon pearl, Ember stone (super rare) and Sun heart, Shadow gem (legendary). Your very first rig find is always a Star shard, and each new rig's first 10 finds are 5 times as likely to be treasure. At the Forge they make unique gear: Ember sword (hits 26), Moon hammer (hits 30, knocks down creatures nearby), Star armour (blocks 70%), and the legendary Sun blade (hits 45, burns everything nearby) and Shadow armour (blocks 80%, every hit you land heals you).
- **Watch an ad**: in the rig panel. All rigs dig 5 times as fast (80% less waiting) for 1 hour, up to 3 times a day. For now it is a 15-second stand-in; a real ad network goes in once the game is online. Extra rig slots cost coins for now; the plan is ₹29 per rig once the game is hosted with a payment service.
- **New finds**: Crater bunny (the Moon, gives Orange glass) and Lost robot (every world, rare: fix it with a Metal sheet for a Gem and 60 coins).
- Testing: `?all` unlocks every world, `?god` stops damage.

## The worlds

Each world is shaped by its real data (NASA planetary fact sheets and the NASA Exoplanet Archive, bundled in `src/planets.js` so the game works offline).

| World | Gravity | Temperature | What's different |
|---|---|---|---|
| Mars | about a third of Earth | about -65 °C | The step 1 world, unchanged. Two lumpy moons. |
| The Moon | about a sixth | -173 °C to 127 °C | Big jumps, craters everywhere, black sky, Earth overhead. Rare: Orange glass on crater rims. |
| Europa | about a seventh | about -160 °C | Highest jumps. Ice shell under the snow, brown salt cracks, Jupiter fills the sky. Rare: Salt. |
| Proxima b | about Earth (best guess) | about -39 °C | Rugged hills under a red star, Alpha Centauri A and B in the sky. Rare: Gold. |
| TRAPPIST-1e | a bit less than Earth | about -23 °C | Dark sand, frozen seas, a big dim red sun and neighbour planets as big as our Moon. |
| LHS 1140 b | almost twice Earth | about -47 °C | Heavy: short jumps, slower walking, flatter land, snow and frozen seas, hazy peach sky. Rare: Gold. |

How the data is used:
- **Gravity** sets how fast you fall and how high you jump (you can always climb one block). It also sets mountain height: light worlds get taller hills, heavy ones are flatter.
- **Temperature** sets how much ice there is. Water-rich worlds get frozen seas.
- **Density** sets how much iron there is, and whether gold appears (worlds as dense as Earth or denser).
- **Air**: airless worlds keep lots of craters and have black skies with harsh shadows; thick air wears craters down.
- **The star**: its real temperature sets the colour of the sunlight, and its real size and distance set how big the sun looks (drawn 3 times bigger so you can see it). Earth, Jupiter and the TRAPPIST-1 neighbours are drawn bigger too, using their real sizes as the base.
- Surface colours for planets around other stars are our guess: nobody has seen their ground yet.

Each world has its own save. Mars keeps your step 1 save. "Pick another world" is in the pause menu.

## Playing on a phone or tablet

Open the game link in your phone's browser (Chrome or Safari), or open play.html on the phone. It switches to touch controls by itself:

| Do this | Touch |
|---|---|
| Walk | Left thumb on the round pad (push far to run) |
| Look | Drag anywhere on the right side |
| Dig | Hold **Dig** |
| Place a block | Tap **Place**. Tap a slot at the bottom to pick the block |
| Jump | **Jump** |
| Bag, ship, pause | **Bag**, **Ship**, **II** at the top right |

Turn the phone sideways for more room. "Full screen" is in the pause menu (where the phone allows it). On phones the game draws a bit less of the world and skips shadows so it runs smoothly. Add `?touch` to the URL to force touch controls, or `?desktop` to turn them off.

## How to play

Open **play.html** in Chrome, Edge or Firefox (double-click it; no install, works offline). Pick a world, click **Land**, then click the game to grab the mouse.

| Do this | Keys |
|---|---|
| Walk, jump, run | W A S D, Space, Shift |
| Look | Mouse |
| Dig | Hold left click |
| Place a block | Right click |
| Choose a block | 1 to 9, or the mouse wheel |
| Bag and making things | E |
| Fix the ship | F when you're next to it |
| See your pilot, or look through your eyes | Y (View on phones) |
| Pause | Esc |

The game saves by itself in your browser. "Start over" is in the pause menu.

## The path to fixing the ship (about 15 to 20 minutes)

1. **Rock**: dig 4 grey rocks lying around by hand, then make a **Rock pickaxe** (E).
2. **Iron**: dig under the red dirt and dust. Iron is dark stone with silver specks. Turn each one into a **Metal sheet**.
3. **Iron drill** (2 metal sheets, 3 rock) lets you dig **purple crystal**.
4. **Ice** is pale blue, in the bottom of craters (on Europa it's under the snow; on TRAPPIST-1e and LHS 1140 b it's the frozen sea). There is a crater just east of the ship.
5. **Purple crystal** glows. Find it in craters or about 14 blocks below the ship.
6. Make the four parts and fit them at the ship (F):
   - Hull patch: 3 metal sheets
   - Engine: 2 metal sheets, 6 dark stone
   - Fuel tank: 6 ice, 1 purple crystal
   - Ship computer: 3 purple crystal, 1 metal sheet
7. Press **Take off**.

Extras: Crystal drill (digs much faster), Metal blocks, Stone bricks and Crystal lamps for building.

## New in step 8: make it a home, and build

- **Home flag**: place it to make that place your home, give it a name, and open a daily gift (bigger for days in a row). Cosy things near the flag (bed, doors, windows, lamps, gardens, colourful blocks, castle pieces, Dragon trophies) raise the home level: Camp, Shelter, Cosy home, Fine home, Star home. Each level gives coins and a perk: creatures can't break your walls there, no night creatures inside, endless air at home, the Trader lands at your home and pays 20% more, and a free extra rig slot.
- **Doors and castle gates** open and close. **Windows and coloured glass** are see-through.
- **Garden beds** grow Moss fruit, even while you are away. Hold it and use it to eat (health and air up).
- **Build panel (K, or the rainbow button in the bag)**: walls, bricks, roofs, glass, lamps and banners in up to 8 bright colours, plus castle brick, castle tops, pillars, railings, gates and two floors.
- **Build plans**: a Castle tower, Castle wall, Castle gate or Bright house, built in front of you in one go, in the colour you pick. "Make the missing blocks and build" crafts what you're short of. You can undo the last build.
- Beating a dragon also gives a **Dragon trophy** for your home.

## Star Kart racing

From the title screen or the pause menu. Three tracks (Red dust loop, Ice canyon, Crystal night), three laps, boost pads, power boxes and drifting (hold Shift while turning, let go for a boost). Every racer gets the same four powers with the same chances: Rocket boost, Crystal shot, Dust bomb and Bubble shield. Race the computer, or race online with anyone who has the game open from its claude.ai link at the same time (computer racers fill empty places). Coins for every finish, extra for online races.

## Step 9: play with friends

- **Friends' camp** (title screen): one world everyone shares. Every block anyone places or digs there is saved for everyone and shows up live. It's peaceful: no waves, no air loss. You start with a building kit. Rigs don't work there, and the camp bag stays in the camp.
- **See your friends**: other pilots walk around the camp with their names over their heads.
- **Say something** (T, or Say on a phone): quick phrases shown over your head and in a little chat box.
- **Gifts**: look at a friend and right click (or Use) to give them things from your bag.
- **Friends online**: the title screen lists who has the game open and where they are.
- Works when the game is opened from its claude.ai link by people it is shared with (edit or contributor access to build).

## For developers

- Three.js, plain JavaScript, no game engine. All block art is drawn in code (16×16 pixels, our own palette).
- `src/world.js` makes the terrain in 16×16 chunks (craters, tunnels, ore layers) and builds the block meshes.
- `src/planets.js` is the real data and the plain-words text. `src/looks.js` turns it into terrain, ores, colours and sky.
- `src/blocks.js` has every block, item and recipe in one place, so names and costs are easy to change.
- Rebuild `play.html`: `npm install` then `node build.mjs` (writes to `dist/`).
- Add `?world=europa` (or moon, proxima, trappist1e, lhs1140b) to the URL to preselect a world.
- Add `?debug` to the URL and press G to fly. `?fps` shows the frame rate. `?r=4` draws less of the world on slow computers.

## Ready for players (Version 9)
- Guided start: six short steps for new players (look, walk, jump, dig, bag, place), 100 coins in all.
- Daily quests: three a day in the book (B), with a bonus for finishing all three.
- Badges: 18 badges, 50 coins each, shown in the book.
- Music: a calm tune for each world, plus race music. Settings: sound, music, picture quality, mouse speed.
- Test: test/ready.js

## Pets (Version 10)
- Any friendly find you have caught can come along as a pet (book, Pets tab). It follows you and brings a present every few minutes (src/pets.js). New badge: Best friend. Test: test/pets.js

## Rover (Version 11)
- Make a Rover in the bag after fixing the ship (4 Metal sheet, 3 Iron, 1 Fuel cell). V (or Drive on phones) to hop in/out. About 3x walking speed, climbs one block, A/D turn. Model makeRover in characters.js. Test: test/rover.js

## Seeing yourself + Looks (Version 12)
- Y (View on phones): camera behind you shows your pilot, pet and Rover. Book > Looks: suits (Sea/Sun 100, Berry/Frost 250 coins) and Rover colours (150). Suit shows to friends in the camp. Test: test/looks.js

## Way finder (Version 13)
- Before the ship is fixed, one clear "Next:" step at a time (stepNow in main.js), with a top arrow + distance to the exact block to dig (glowing beam and bouncing arrow over it), "Press E" prompt when it is time to make something, and the ship when a part is ready. Test: test/way.js

## Graphics pass (Version 14)
- Real water (src/water.js): smooth moving sea with ripples and sun shine on TRAPPIST-1e and LHS 1140 b (liquid seas with ice floes), swimming, underwater tint. Glow (bloom) on bright things, off on Fast setting. Test: test/gfx.js <world>

## Version 15
- Settings > Try everything: Unlock everything (all worlds, ship fixed, Sun blade + Shadow armour, Rover, 5000 coins, 12 fuel cells) and Jump to wave 11/21/31/41/Dragon. profile.testAll.
- Digging chips, landing dust puffs, footprints (fx2.js createPrints), sunset glow, aurora (Europa, LHS 1140 b, faint on Moon), weather (rain TRAPPIST-1e, snow Europa/LHS, dust Proxima + Mars storms), lava sea on Proxima b (hurts). Test: test/v15.js

## Version 16: never stuck in holes
- Hold Jump against any wall to climb it (player.touchingWall). 6+ blocks down: "Back to the top" button (U) puts you on the highest ground nearby. Test: test/climb.js

## Version 17: villains, rewards, Shop, team play
- Gloom imp camps (enemies.js `imp`, adventure.js camps): fires with skulls 30-48 blocks out; imps attack within 9 blocks. Each imp gives coins, a cleared camp gives a chest + coins (+ maybe a Gem).
- Rewards: first win of the day pays double, every 5th wave a free Gem, every 10th wave a stage bonus.
- Shop (H): next weapon, Sharper weapon (+12% hit per level), Tougher suit (-8% hurt per level), Faster digging (+20%), ship tank/engines, fuel cells, Gems. Stored in profile.ups.
- Team up (title screen): same world for up to 3 friends with a 4-letter code. Blocks and fitted ship parts are shared (db `team/<code>/chunks` and `team/<code>/info`), and the 4 ship parts are split between players (myJobs). Works in the claude.ai link only; the public site and phone app need a server. Tests: test/imps.js, test/team.js

## Version 18: Prizes (more reasons to come back)
- src/hooks.js. Pilot level: everything you do gives points (XP table; digging 1, imp 10, wave 30, dragon 400). Each level pays coins + 1 spin, Fuel cells every 3rd, a Gem every 5th, 500 coins + 3 Gems every 10th. HUD shows level bar and a Prizes button with a red dot when something is waiting.
- Prizes panel (R, or Prizes on phones): Lucky wheel (1 free spin a day plus spins from levels; up to a 1000-coin jackpot), free chest every 4 hours, Rewards road showing the next 8 levels.
- Lucky digs: about 1 in 25 dug blocks hides 5-25 coins (gold sparkle), very rarely a Gem. Saved in profile.hk. Test: test/hooks.js

## Version 19: never lost, never stuck
- "Back to the top" now uses the ground around you (groundAbove: highest ground in 5x5 minus your feet) and shows at 3+ blocks down anywhere, not only measured from the ship height. Climbing: wall check 0.35, climb speed 5.5.
- Mission line (#mission, renderMission): always says "Mission N of 4: fix your ship" (or the wave) plus the one thing to do now.
- Find ship (N; on phones the Ship button turns into Find ship when you are away): green ground arrows toward the ship, a tall green light over it, top arrow points home; stops when you arrive. The light also turns on by itself at night when you are 20+ blocks away. Test: test/stuck.js

## Version 20: fixes found by the walkthrough bot
- Back to the top now works during waves too, so digging into a hole mid-fight never traps you.
- Wave creatures that fall into a pit or get stuck on a ledge hop back out next to you after 3 seconds.
- A wave can no longer get stuck at "1 left" with nothing to hit.
- Film mode (`?film`) lets the game be recorded frame by frame. The Mars walkthrough video is `mars-walkthrough.mp4`, made by `test/walkthrough.js`.

## Version 22: real Mars landscapes and colours
Each new place is based on a real place on Mars:
- A giant volcano to the north-east of the ship, with a crater on top, a cliff round its foot and frost on the summit (Olympus Mons). More volcanoes far away.
- Deep winding canyons with striped walls (Valles Marineris).
- Stepped, striped hills of tan rock, pale clay and purple rock (Mount Sharp in Gale crater). One is just west of the ship.
- Fields of dark grey sand dunes with wind ripples (the Bagnold dunes). One is south-east of the ship.
- White frost on high, cold ground.
- New blocks: Dark sand, Tan rock, Pale clay, Purple rock, Black rock, Frost (gives Ice), and two rare ones: Yellow stone (real: Curiosity cracked open a yellow rock in 2024) and Green stone (real: green crystals in Jezero crater).
- The day sky is now butterscotch tan, and at sunrise and sunset the sky round the sun glows blue, like real Mars.
- Far mountains on the horizon, and dust devils that wander across the plains on sunny days.
- Screenshots: screenshots/mars-v21/. Test: test/mars.js.

## Version 23: more real landscapes, on every world
- Mars: pebbles and small stones on open ground; old rover tracks running east from near the ship to an old rover with a supply box on its back; thin blue-white clouds; the air turns hazy a minute before a dust storm (with a warning); the north ice cap far to the north (walk about 300 blocks), ice with dark dusty layers and curving valleys.
- The Moon: dark flat lava seas (the maria), bright rays around young craters (like Tycho), a winding rille.
- Europa: chaos ground, where the ice broke into rafts and froze again (Conamara Chaos), and tall water plumes shooting out of the ice.
- Proxima b: small ash volcanoes. TRAPPIST-1e: sandy beaches and grey sea cliffs. LHS 1140 b: ice cliffs and blue crevasses.
- Clouds on worlds with air. New block: Sand.
- Screenshots: screenshots/worlds-v23/. Test: test/worlds2.js. The walkthrough bot now plays in first person.

## Version 24: treasures and suits
- 36 treasures, 6 on each world, each one based on something real (iron rocks from space on Mars, the Apollo orange glass beads, Europa's salt, and more). Each comes with a short true fact.
- Find them three ways: hidden in certain blocks when you dig, inside old supply boxes, or as a sparkle with a light beam lying on the ground nearby (walk to it). Each treasure gives 40 coins and XP.
- New Treasures page in the book (B) with a picture of each treasure and a hint for the missing ones.
- 14 new suits with patterns: Lime, Rust (camo), Racing (stripes) for coins; Night sky (stars), Glow lines, Lava for Gems; reward suits for finishing each world's treasures (Red planet, Moon dust, Ice crystal, Red sun, Deep sea, Snow), Gold for every treasure, Dragon scale for beating a dragon.
- The Looks page shows a picture of every suit. Friends see your suit in the camp.
- Code: src/treasures.js, suit patterns in src/characters.js. Test: test/treasures.js.

## Version 25: better visuals
- Colour grading on Normal and Far view: richer colour, warm days, cool blue nights, golden sunsets, soft dark corners.
- Low haze: dust (or mist) settles in valleys, canyons and craters, so deep places look deep.
- Lamps light up the ground round them at night (the 6 nearest; off on the Fast setting).
- The ship has red and green side lights and a white blink on top.
- Floating dust on Mars, ice glitter on cold worlds, embers on Proxima b, shooting stars on clear nights.
- Far mountains on the horizon on every world with air.
- Screenshots: screenshots/visuals-v25/. Test: test/visuals.js.

## Version 26: the final mission, to another galaxy
- New end goal: build antimatter fuel and fly to the Andromeda galaxy. After 10 waves on a world the mission line starts showing the next step (it takes turns with the wave line), and the book (B) has a "Final mission" page with all 9 steps.
- Mine special minerals on different worlds and forge them (Forge, new section at the bottom):
  Magnet ring (iron + yellow stone, Mars), Focus lens (glass + sand, Moon / TRAPPIST-1e), Cold core (salt + ice, Europa), Heat shield (black rock + gold, Proxima b / LHS 1140 b), Power crystal (purple crystal + Gems).
  The four parts make an Antimatter trap (real idea: CERN holds antimatter in magnet traps). Trap + power crystal + dragon scale = 1 Antimatter cell.
- 2 Antimatter cells + 1 dragon scale + 10 metal sheets fit the Galaxy drive (star map, M). Then fly 2.5 million light years to Andromeda (6 fuel cells; 2 between its worlds).
- Three new made-up worlds there, each with its own colours, sky, 50 waves and a dragon at wave 50:
  Glass world (blue-white star, blue crystal ground, Crystal dragon), Blue world (warm ocean world with beaches, Wave dragon), Ring world (desert under a giant ring, Gold dragon). From there the Milky Way hangs in the sky.
- Arriving the first time: big celebration, +3000 coins and the Star traveller suit. Mars nights now show a faint Andromeda in the sky.
- Test: test/final.js (forges every part, fits the drive, flies to all three new worlds).
