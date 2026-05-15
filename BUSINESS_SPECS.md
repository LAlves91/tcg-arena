# TCG Arena — Product Specification

A platform for playing physical trading card games (One Piece TCG, Pokémon TCG, and later Yu-Gi-Oh!, Magic, Lorcana, etc.) remotely, hybridizing the in-person experience (real cards, real shuffling, real expressions) with the conveniences of online play (life trackers, dice, card recognition, matchmaking, tournaments).

-----

## 1. Product Pillars

1. **Real cards, real opponents.** Players use their physical decks. The app handles everything *around* the cards.
1. **The board is the stream.** A top-down video feed of each player’s play area is the primary game state. Cards are not abstracted into icons or sprites.
1. **Tap any card, get its data.** Computer vision identifies cards on stream so any player or spectator can pull up the full card text on demand.
1. **Game-aware tooling.** Each supported TCG gets its own controls panel: life/HP, DON!! deck, prize counters, coin flips, dice rolls, status counters, turn phases — whatever that specific game needs.
1. **Community-first.** Find opponents, run tournaments, watch others play. The social layer is what keeps people coming back.

-----

## 2. Supported Games (Launch & Roadmap)

**Launch:** One Piece Card Game, Pokémon TCG.
**Phase 2:** Yu-Gi-Oh!, Magic: The Gathering, Disney Lorcana.
**Phase 3:** Dragon Ball Super Fusion World, Star Wars: Unlimited, Flesh and Blood, Digimon, Union Arena.

Each game ships as a “game module” defining: card database, board layout template, control widgets, rules glossary, format definitions (Standard, East/West for OP TCG, etc.), and ban lists.

-----

## 3. Core Match Experience

### 3.1 Match setup

- **Create / join lobby.** Pick game, format, time limit, best-of, table visibility (public / friends / private link / unlisted).
- **Pre-game checklist.** Camera framing check (“is your full board visible?”), audio check, deck list submission (optional or required depending on format), proxy policy agreement, rule-zero notes (especially for casual / commander-style formats).
- **Deck registration.** Players can paste a deck list (format-aware parser) or skip for casual. Lists are private until tournament rules require reveal.

### 3.2 Video streams

Each player has up to **three configurable streams**:

1. **Overhead board cam (required).** Top-down view of the entire play area, hand excluded.
1. **Face cam (optional but encouraged).** Webcam pointed at the player. Improves trust and table presence.
1. **Hand cam / secondary angle (optional).** For players who want to show a side angle or a focused view of a specific zone.

**Layout options:** four-corner grid, focused (active player large + others as PiPs), spotlight (any chosen stream large), spectator-style broadcast layout.

**Stream sources:** desktop webcam, phone-as-camera (companion mobile app turns a second phone into the overhead cam, paired via QR code), or external capture device. The mobile companion is the cheapest path for users and a key onboarding lever.

### 3.3 Card recognition & lookup

- **Tap any card on any video stream → high-res card art and full rules text panel.** Powered by computer-vision identification (top-down view, OCR + image hash match against the game’s card database).
- **Search by name** fallback when recognition fails or for cards in graveyard/discard piles not currently in frame.
- **Recognition confidence shown to user**; ambiguous matches offer top 3 candidates.
- **History panel:** every card looked up during the match is logged in a sidebar so you can revisit it without re-clicking the stream.
- **Pin a card** on the board: keep a persistent marker for cards that have ongoing effects, attached counters, etc.

### 3.4 Game-aware control panel

Each TCG has its own widget set in a side panel:

- **Pokémon TCG.** Prize counter (6→0 per player), HP trackers per Pokémon in play with damage counters (in increments of 10), special conditions tokens (Burned, Asleep, Confused, Paralyzed, Poisoned), coin flip, GX/V-STAR marker, turn counter.
- **One Piece TCG.** Leader life counter, DON!! deck counter (active/rested split), don attach trackers per character, counter values shown, turn/phase indicator.
- **Yu-Gi-Oh! (Phase 2).** Life points (8000 default, configurable), dice, coin, monster zone counters, phase tracker.
- **Magic: The Gathering (Phase 2).** Life totals, commander damage matrix, poison/infect counters, mana pool, +1/+1 and –1/–1 counters, day/night, the monarch, dungeon tracker.

**Universal widgets:** dice (any sided), coin flip, custom counters with labels, turn timer, chess clock mode, undo last action.

### 3.5 Turn / phase management

- Optional turn announcer (“Your turn — Main Phase”).
- Soft phase tracker: the game knows the phases of each TCG and shows where players claim to be, but doesn’t enforce.
- Pass-the-turn button that auto-applies common upkeep effects (e.g., set all DON to active in OP TCG, draw notification in Pokémon, untap step in MTG).

### 3.6 Anti-cheat & integrity

- **Board visibility enforcement.** A periodic CV check confirms the entire declared play zone is in frame. Toggling off the camera mid-match triggers a warning and can be auto-loss in tournament mode.
- **Replay buffer.** Last 5 minutes of each stream cached locally so disputes can be reviewed.
- **Judge call.** Button to summon a tournament judge (or any moderator the room has invited) who joins as an observer with side-chat access to both players.
- **Deck reveal on demand.** In tournament play, a judge can request a deck count or full deck reveal mid-match.

### 3.7 Audio & comms

- Voice chat via WebRTC, default push-to-talk in tournaments, open-mic for casual.
- Per-match text chat with quick emotes (gg, gh, n1, mulligan, etc.).
- Noise suppression toggle (RNNoise or similar).
- Mute opponent, mute table chat, mute spectators all independently.

### 3.8 Spectators

- Join any public match as a spectator with one click.
- Spectators see all streams but no private chat between players; they have their own spectator chat channel.
- **Lag spectator option** (30–60s delay) on tournament feeds to prevent stream sniping.
- Spectator counter visible (or hidden if players prefer).
- Spectators can tip/cheer players in casual matches (Phase 3 monetization hook).

### 3.9 Match outcome & reporting

- Both players confirm winner and game state at end (e.g., final life totals, turns played).
- Disputed results escalate to a judge or, if no judge, lock the match pending screenshot/replay evidence.
- Match feeds into player ratings, tournament standings, and personal stats.

-----

## 4. Matchmaking & Community

### 4.1 Game hubs

Each supported TCG has its own “hub” — a landing space showing:

- Active live matches you can spectate.
- Open lobbies sorted by format, skill, region/latency.
- Tournaments (upcoming, live, past).
- Meta snapshot (top decks, trends — Phase 2).
- News from the publisher (set releases, ban list updates).

### 4.2 Finding opponents

- **Quick match.** Pick a format, get queued for someone of similar rating in your region.
- **Custom lobby.** Spin up an open or private room with your own rules and let people join.
- **Friends list.** Add players, see who’s online, challenge directly.
- **Recurring partners.** Frequent opponents and pods (e.g., commander groups) can save as a recurring group.

### 4.3 Ranking & profile

- **Per-game ELO/Glicko rating.** Casual and ranked queues are separate.
- **Seasonal rankings** with cosmetic rewards (avatar frames, profile flair).
- Public profile: games played, win rates per deck/archetype (if deck lists submitted), tournament history, recent matches with replay clips.

### 4.4 Tournaments

- **Anyone can create** a tournament: choose game, format, bracket type (Swiss, single/double elim, round robin), round time, decklist policy, prize info (organizer-managed, app does not handle payouts directly at launch).
- **Bracket engine** handles pairings, tiebreakers, score reporting, top-cut.
- **Judge tools:** assign judges with elevated permissions to drop into any match, issue warnings, override results.
- **Tournament page** for players: their bracket, current pairing, opponent’s deck (if open lists), match check-in, drop button.
- **Broadcaster mode:** feature match streaming with overlays (player names, deck archetypes, life totals pulled from the in-app controls). Hook for Twitch/YouTube restreams.

### 4.5 Social layer (see Section 5 for the build vs buy decision)

- Friends, blocks, reports.
- Direct messages.
- Game-specific channels for chat outside matches (deck tech, trade talk, finding pods).
- Profile pages, follows, activity feed.

-----

## 5. The Chat Question (Important)

You’re right to be worried — building a full Discord-clone is a separate startup. Three viable paths, ordered by scope reduction:

### Option A — Ship as a Discord Activity (lowest scope, recommended for MVP)

Discord’s **Embedded App SDK** lets you run your entire app as an iframe inside Discord (“Activities”). Users launch TCG Arena from a Discord voice/text channel; Discord handles identity, friends list, voice chat, text chat, screen sharing primitives, presence, invites, and discovery. You build the match experience; Discord is your social layer.

**Pros:** Massive scope reduction. Zero work on the “Discord-like” layer. Distribution: a Discord user can invite friends to your activity in two clicks. Mobile, desktop, and web all covered by Discord’s own clients. Monetization rails available (one-time purchases, subscriptions).

**Cons:** You’re a tenant in Discord’s ecosystem — they can change policies, take a cut of monetization, or restrict iframe capabilities. Camera-heavy use may strain the SDK (worth a technical spike early). Players who don’t use Discord can’t easily play.

**Recommendation:** Build the MVP as a Discord Activity. The TCG webcam community already lives on Discord — every Limitless tournament uses Discord voice channels for matches today. You’re meeting them where they are.

### Option B — Standalone app with deep Discord/Twitch integration

Your own web/mobile app, with Discord OAuth login, a Discord bot that posts match invites and tournament brackets to servers, and Twitch embed support for spectator streaming.

**Pros:** You own the experience and brand. You can build features Discord wouldn’t allow (custom overlays, advanced tournament tools).

**Cons:** You still need *some* social features (friends list, in-match chat, profile). You’ll need to build that — though much narrower than “Discord-like.”

### Option C — Standalone app with a chat-as-a-service backend

Build the social layer using **Stream Chat**, **Sendbird**, or **TalkJS** as drop-in SDKs. You get channels, DMs, threads, reactions, moderation tools, push notifications, all branded as yours.

**Pros:** Full ownership of UX without building chat infrastructure from scratch. Mature SDKs with React/React Native components.

**Cons:** Per-MAU pricing gets expensive fast (Stream is roughly free up to ~10k MAU, then tiered). You’re still building friends/profile/community features around the chat primitives.

### Best path

**Start with Option A (Discord Activity) for MVP.** Validate the match experience and CV pipeline with the community that’s already organized on Discord. If the product takes off and you outgrow Discord’s constraints, Option B becomes the natural Phase 2 — you can keep the Discord Activity as a distribution channel while building the standalone app for power users and tournaments.

For Twitch: integrate as a one-way thing — players can broadcast their TCG Arena match to their Twitch channel with a button, including overlays driven by the in-app game state.

-----

## 6. Competitive Landscape

### Direct competitor (the closest existing thing)

- **SpellTable** (by Wizards of the Coast). Browser-based webcam play for Magic: The Gathering. Has card recognition, life trackers, multi-player layouts, lobby system. **The single biggest reference point for your product.** But: MTG-only on the recognition side, no real tournament infrastructure, no Pokémon/One Piece game modules, no native mobile, no social layer beyond match lobbies. Many players use it for *other* TCGs with the recognition disabled — pure unmet demand sitting there.

### Adjacent / partial competitors

- **Limitless TCG.** Tournament platform (Swiss pairings, brackets, decklist submission) for Pokémon, One Piece, Lorcana, and more. Players use it for matchmaking but games are played in **Discord voice channels with webcams and physical cards** — exactly the workflow you’d be productizing. They’ve effectively proven the demand by ignoring half the experience.
- **OPTCGSim, Untap.in, TCGOne, Tabletop Simulator.** Fully digital simulators — opposite of your model. Useful only as evidence that players want to play remotely; they don’t compete on the “real cards” axis.
- **Pokémon TCG Live, MTG Arena, Yu-Gi-Oh! Master Duel.** Official digital clients. Again, fully digital. Different product.
- **PlayingCards.io, Tabletopia.** Generic virtual tabletops. No physical-card hybrid play, no CV.

### The wedge

SpellTable is officially MTG-only and hasn’t expanded. The webcam-Pokémon and webcam-One Piece communities currently play **on Discord with no purpose-built tools** and use Limitless purely as a pairing spreadsheet. There’s no app that combines: (a) board video, (b) game-specific controls, (c) card recognition, and (d) tournament tooling for non-MTG games. That’s your opening.

-----

## 7. Mobile & Hardware

### 7.1 Companion mobile app

- Use phone as the overhead camera (the cheapest, most common setup).
- Pair to desktop session by QR code or short code.
- Phone runs only the camera + sensors; the main UI stays on the larger screen.

### 7.2 Mobile-only play

- Full app on phone is possible for casual play (especially Pokémon, which has a smaller board), but multi-stream layouts struggle on small screens. Treat as Phase 2.

### 7.3 Hardware recommendations

- Curated “TCG Arena ready” hardware list: 1080p webcams with overhead-mountable arms, ring lights, matte playmats. Affiliate revenue opportunity. Bundle deals with retailers.

-----

## 8. Tech Considerations

### 8.1 Video transport

- **WebRTC** for low-latency player streams.
- Peer-to-peer for 1v1; SFU (Selective Forwarding Unit) for 3+ players and spectators.
- Recommended SFU options: LiveKit (open source, self-hostable, scales well), Daily.co, Agora, or Mediasoup.

### 8.2 Card recognition pipeline

- Frame capture every N seconds (or on click) from the overhead stream → server-side CV → identifier returned.
- **Option A: build in-house.** OpenCV for card edge detection + perspective transform, image hashing (pHash/dHash) + OCR fallback for ambiguous matches. Card database per game pulled from public APIs (Scryfall for MTG, Pokémon TCG API, fan-maintained One Piece databases).
- **Option B: use a vendor.** Ximilar’s Collectibles Recognition API supports 15+ TCGs including Pokémon, One Piece, Yu-Gi-Oh!, Magic, and Lorcana — likely much faster path to launch. TCGAPIs also offers a /recognize endpoint. Per-call pricing; works fine for click-to-identify (low volume per match) but expensive if you wanted always-on continuous recognition.
- **Recommendation:** start with a vendor for breadth, build in-house later if cost or latency demands it. Start click-to-identify only, not continuous board tracking.

### 8.3 Stack sketch

- **Frontend:** Angular PWA (web & mobile companion). Discord Activity is an Angular app served from your CDN with iframe embedding.
- **Backend:** Node.js service (in Typescript), Postgres for persistent data (users, decks, tournaments, matches), Redis for matchmaking/lobby state.
- **Media:** LiveKit cluster.
- **CV:** Ximilar or equivalent vendor at launch; in-house ML service later.
- **Auth:** Discord OAuth (mandatory if Activity), email/social login if standalone.

-----

## 9. Monetization (Phase 2+)

- **Free tier:** casual play, basic tournaments, standard layouts.
- **Premium subscription:** advanced overlays for streamers, replay storage, advanced stats, custom playmats, priority matchmaking, no ads in spectator mode.
- **Tournament organizer tier:** create paid-entry tournaments with payout management (taking a small platform fee), broadcast overlays, sponsor branding slots.
- **Hardware affiliate / store partnerships.**
- **Card retailer integrations.** “Buy this card” buttons next to the card details pane (affiliate links to TCGplayer, Cardmarket, local game stores).

Avoid loot-box, gacha, or “buy-to-win” mechanics. The product is about physical cards; the digital layer must stay neutral.

-----

## 10. Suggested MVP Scope (3–4 months)

**Cut for MVP:**

1. **One game only — One Piece TCG.** (Smaller card pool than Pokémon, hungry community, less direct competition than Pokémon.) Pokémon as fast-follow.
1. **Ship as a Discord Activity.** No standalone app yet.
1. **1v1 matches only.** No multi-player formats.
1. **Two streams per player** (board + optional face). No third stream.
1. **Click-to-identify card recognition** via vendor API. No continuous board tracking.
1. **Casual matches + simple bracket tournaments.** No ELO yet, no seasons.
1. **No mobile companion.** Users use phones as webcams via existing tools (Camo, Iriun) at launch.

**Validate against:** the Limitless + Discord OPTCG tournament organizers. If 2–3 of them adopt TCG Arena for their weekly events, you have product-market fit.

-----

## 11. Open Questions / Risks

1. **Card recognition accuracy** on lower-quality phone cameras with glare-prone sleeves. Mitigation: vendor-graded API, manual search fallback, lighting/setup guides.
1. **Discord Activity limits on continuous video** in iframes — needs a technical spike before committing to Option A.
1. **IP/licensing.** Card images and rules text are copyrighted by Bandai, The Pokémon Company, Konami, WotC, etc. Most fan tools (Limitless, Untap, OPTCGSim) operate in a gray zone; some have official partnerships, some are tolerated. Need legal review before any monetization beyond cosmetic subscriptions.
1. **Anti-cheat ceiling.** No webcam system fully prevents stacking a deck off-camera. Tournament integrity will always have a human-judgment component.
1. **Latency.** Multi-stream WebRTC with 3–4 players + spectators is non-trivial to keep smooth on consumer connections. Plan for adaptive bitrate and a clear minimum-spec policy.