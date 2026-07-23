# Graph Report - .  (2026-07-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 819 nodes · 1573 edges · 44 communities (40 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e13838a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42

## God Nodes (most connected - your core abstractions)
1. `WorldScene` - 69 edges
2. `BattleScene` - 51 edges
3. `EventBus` - 31 edges
4. `UIOverlayScene` - 21 edges
5. `GameSocket` - 18 edges
6. `handleDuelMessage()` - 16 edges
7. `DeckSelectScene` - 15 edges
8. `scripts` - 15 edges
9. `GameAudio` - 14 edges
10. `GameMapKey` - 13 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `applyAction()`  [EXTRACTED]
  scripts/verify-duel-room.mjs → server/duelEngine.mjs
- `main()` --calls--> `tickTimer()`  [EXTRACTED]
  scripts/verify-duel-room.mjs → server/duelEngine.mjs
- `paintMute()` --calls--> `isGameMuted()`  [EXTRACTED]
  harness/src/main.ts → game/audio/GameAudio.ts
- `createLiberGame()` --indirect_call--> `BattleScene`  [INFERRED]
  game/createGame.ts → game/scenes/BattleScene.ts
- `createLiberGame()` --indirect_call--> `DeckSelectScene`  [INFERRED]
  game/createGame.ts → game/scenes/DeckSelectScene.ts

## Import Cycles
- 2-file cycle: `game/EventBus.ts -> game/quests/types.ts -> game/EventBus.ts`

## Communities (44 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (39): applyOpponentAction(), applyPlayerAction(), canEquipGuild(), checkEnd(), clampHp(), cloneFighter(), createInitialBattle(), demoGuildCard() (+31 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (32): GameAudio, isGameMuted(), MusicKey, readMuted(), setGameMuted(), SfxKey, createLiberGame(), CreateLiberGameOptions (+24 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (29): requireAgentSecret(), PORT, runChat(), server, cached, DEFAULT_PACK, __dirname, loadKnowledgePack() (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (20): BattleCard, catalog, CatalogEntry, CatalogFile, clearHandSelection(), commonCards(), getCard(), guildCards() (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (5): RemotePlayerPayload, pushSample(), sampleAt(), shortAddr(), WorldScene

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (30): description, devDependencies, phaser, @types/node, typescript, engines, node, phaser (+22 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, ES2022, ./game/*, harness/dist, harness/node_modules, harness/src/**/*.ts, harness/src/**/*.tsx (+19 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (23): BattleOpenedPayload, BattleResultPayload, CameraZoomDeltaPayload, ChatMessagePayload, CompanionSpeakPayload, DialogueOpenPayload, GameFacing, Handler (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (17): CONTENT_LANGS, ContentLang, de, en, es, fr, loadContentLang(), pt (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.23
Nodes (20): broadcastEnd(), broadcastState(), byAddress, cleanupRoom(), findOpenWaitingRoom(), handleDuelMessage(), leaveRoom(), onDuelSocketClose() (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (18): duelRoomCount(), broadcast(), connectedCount(), getRoom(), kickOldSocket(), LANGS, MAPS, normalizeLang() (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.20
Nodes (19): Path, bob(), chroma_magenta(), fit_frame(), load_frame(), main(), make_normal(), parse_dir_map() (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (4): fetchToken(), GameSocket, GameSocketHandlers, guestId()

### Community 13 - "Community 13"
Cohesion: 0.23
Nodes (3): getQuestSnapshot(), takePendingQuestToasts(), UIOverlayScene

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (14): BODY_CODE, DEFAULT_COSMETICS, DEFAULT_GEAR, GameCosmetics, GameGear, normalizeCosmetics(), resolveSheetKey(), MapNpc (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (18): dependencies, ether-game, phaser, devDependencies, typescript, vite, ether-game, phaser (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (14): AmbientHandles, applyWorldFX(), clearCameraFilters(), CloudHandles, createAmbientParticles(), createDayNightCycle(), createParallaxClouds(), DAY_AMBIENT (+6 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (15): dependencies, @supabase/supabase-js, description, engines, node, name, private, scripts (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.28
Nodes (15): applyOpponentAction(), applyPlayerAction(), canEquipGuild(), checkEnd(), clampHp(), cloneFighter(), createInitialBattle(), demoGuildCard() (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.24
Nodes (14): closePair(), connect(), __dirname, drain(), main(), openDuel(), require, token() (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (12): GameSessionPayload, @/game/quests/engine.mjs, QuestDef, QuestHit, QuestProgress, acknowledgeQuestToast(), QuestObjective, QuestObjectivePayload (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.28
Nodes (13): createProgress(), ApplyResult, finishApply(), load(), noteTalkNpc(), noteVisitMap(), noteWinDuel(), objectiveMessage() (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (12): at(), BRIDGE_COLS, CANAL_ROWS, collision, __dirname, keepWalls, map, mapPath (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (14): dependencies, ether-game, ws, engines, node, ether-game, name, private (+6 more)

### Community 24 - "Community 24"
Cohesion: 0.21
Nodes (12): allIds, commons, g, guilds, hand, threeCommons, buildGuild(), buildHand() (+4 more)

### Community 25 - "Community 25"
Cohesion: 0.17
Nodes (3): isTouchDevice(), TouchControls, TouchVector

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (11): applyMatching(), applyTalk(), applyVisit(), applyWinDuel(), markObjective(), QUESTS, snapshot(), noop (+3 more)

### Community 27 - "Community 27"
Cohesion: 0.27
Nodes (12): applyAction(), checkEnd(), clampHp(), cloneFighter(), demoGuildCard(), demoHand(), findCard(), makeFighter() (+4 more)

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (8): collision, COLLISIONS, __dirname, map, mapPath, NPCS, SPAWNS, TRANSITIONS

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (8): collision, COLLISIONS, __dirname, map, mapPath, NPCS, SPAWNS, TRANSITIONS

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (9): chatOnA, chatOnB, connect(), expired, good, once(), require, sign() (+1 more)

### Community 32 - "Community 32"
Cohesion: 0.18
Nodes (8): big, buf, ex, extrap, half, held, mid, snapped

### Community 33 - "Community 33"
Cohesion: 0.20
Nodes (3): assetsDir, __dirname, root

### Community 34 - "Community 34"
Cohesion: 0.20
Nodes (8): agentRoot, __dirname, liberRoot, outDir, outPath, parts, skillSnippets, sources

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (8): compilerOptions, types, extends, include, ../game/**/*.ts, src/**/*.ts, ../tsconfig.json, vite/client

### Community 36 - "Community 36"
Cohesion: 0.22
Nodes (5): battle, __dirname, forest, outDir, town

### Community 38 - "Community 38"
Cohesion: 0.25
Nodes (3): __dirname, files, outDir

### Community 39 - "Community 39"
Cohesion: 0.25
Nodes (6): collision, __dirname, landmarkObjects, LANDMARKS, map, mapPath

## Knowledge Gaps
- **247 isolated node(s):** `Handler`, `CompanionSpeakPayload`, `DialogueOpenPayload`, `QuestTalkPayload`, `CameraZoomDeltaPayload` (+242 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WorldScene` connect `Community 4` to `Community 1`, `Community 37`, `Community 7`, `Community 41`, `Community 14`, `Community 16`, `Community 20`, `Community 25`, `Community 28`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `BattleScene` connect `Community 0` to `Community 16`, `Community 1`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `EventBus` connect `Community 1` to `Community 0`, `Community 4`, `Community 37`, `Community 7`, `Community 41`, `Community 13`, `Community 14`, `Community 16`, `Community 20`, `Community 21`, `Community 28`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `Handler`, `CompanionSpeakPayload`, `DialogueOpenPayload` to the rest of the system?**
  _247 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06429548563611491 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06233766233766234 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10121457489878542 - nodes in this community are weakly interconnected._