# Sugar — Product Requirements (PRD)

## Original Problem Statement
Build "Sugar", a mobile random live-video dating app (Chatroulette/Omegle vibe, modern dating). Users are matched randomly via a realtime queue. Swipe left or tap "Next" to instantly disconnect the current partner and connect to the next available person. Lobby ("Willkommen bei Sugar") + camera permission + "Start Dating". Video stage: partner feed full-bleed, own feed small PiP, big "Next" button + swipe gesture. "Searching for Sugar..." loading state. Luxurious dark/neon direction, refined by user to Red/Pink/White luxury. Login/profile with verification is mandatory.

## User Choices
- MVP first with simulated/demo video feed + full swipe/matching logic; real WebRTC later.
- Realtime matching/signaling via WebSocket (FastAPI) with a waiting queue.
- Design: luxurious Red/Pink/White, gender-individualized accents.
- Mandatory email/password login + profile with verification (selfie upload).

## Architecture
- Frontend: Expo (React Native) SDK 54, expo-router (stack), reanimated + gesture-handler, expo-blur/linear-gradient, expo-camera, expo-image-picker, keyboard-controller. Fonts: Playfair Display (display) + DM Sans (text) loaded via fontsource CDN.
- Backend: FastAPI + Motor (MongoDB). JWT (PyJWT) email/password auth, passlib bcrypt hashing.
- Realtime: FastAPI WebSocket at `/api/ws?token=<jwt>` with an in-memory MatchManager (queue, real pairing, bot fallback after 4s, next/stop/disconnect teardown).
- Video is a simulated mock (partner/self images + live camera PiP when permitted). Real WebRTC deferred (requires native build; won't run in Expo Go).

## User Personas
- Verified singles wanting spontaneous, safe, face-to-face random dating.

## Core Requirements (static)
- Mandatory auth + selfie verification gate before entering the pool.
- Instant random matching with a realtime queue.
- Swipe-left / Next to skip instantly; "Searching for Sugar..." between matches.

## Implemented (2026-06)
- Auth: signup/login/me, JWT, duplicate + weak-password guards. [done]
- Profile verification: selfie (camera/gallery, base64) → verified flag. [done]
- Route guards: index/lobby/verify redirect based on token + verified. [done]
- Lobby: welcome, camera permission (contextual + Open Settings fallback), Start Dating. [done]
- Video Stage: WebSocket connect, searching (pulsing glass heart), matched (full-bleed partner feed, name chip, verified badge, self PiP), Next button + swipe-left gesture, Stop, error/retry. [done]
- Matching backend: real 2-user pairing, partner_left on next, solo bot fallback (~4s). [done]
- Luxury Red/Pink/White theme, Playfair/DM Sans, haptics, gender-individual accents. [done]
- Tested: backend 12/12 pytest pass; frontend core flows verified (login→lobby→stage→next→stop).

## Implemented (2026-06, update 2)
- Wunsch-Matching (preference): profile `preference` (female/male/everyone), selector in Lobby, PATCH /api/profile/preferences, mutual-preference filtering in the queue + preference-aware bot fallback. [done]
- Safety — Report + Block: right-side action rail on the stage. Block (ws `block`, persisted, never re-matches) + Report (reason sheet, POST /api/report, then skip). [done]
- Live text chat: ws `chat` relay between real partners; canned bot auto-replies for solo demo; chat overlay with bubbles + keyboard-safe input. [done]
- Verified end-to-end: chat relay, block→both-bots, preference→male bot, bot reply, report all pass; UI screenshots confirm.

## Implemented (2026-06, update 3 — big expansion)
- Tab-Navigation (stack→tabs): Entdecken · Video · Matches · Profil. [done]
- Profil-Erstellung: Name, Bio, Alter, Land, bis zu 6 Fotos (Kamera/Galerie), Präferenz. PATCH /api/profile. [done]
- Foto-Matching (Entdecken): Tinder-Swipe-Deck (Gesten + Buttons Pass/Herz/Like), Reanimated-Karten, „Es ist ein Match!"-Overlay. GET /api/discover, POST /api/swipe. Demo-Profile matchen immer zurück. [done]
- Gefällt-mir-Herz: Super-Like (Herz) + gegenseitig → dauerhaftes Match. [done]
- Match-Historie: Matches-Tab (Liste + letzte Nachricht + Pull-to-Refresh) und persistenter DM-Chat /chat/[id] mit Demo-Auto-Antworten. GET /api/matches, /matches/{id}, POST /matches/{id}/messages. [done]
- Länder-Filter im Entdecken-Tab, gated ab Sugar Gold (sonst → Paywall). [done]
- Abo-Modelle (Mock, kein echtes Geld): Free 0€ · Sugar Plus 4,99€ · Sugar Gold 7,99€ · Sugar VIP 15,99€ mit kreativen Feature-Listen. /subscribe Screen. GET/POST /api/subscription. [done]
- Video-Feature kostenpflichtig ab Sugar Plus: Paywall im Video-Tab + WebSocket sendet {type:"paywall"} bei tier=free. [done]
- Kamera-Verifizierung: Galerie-Auswahl entfernt, nur Live-Selfie. [done]
- WebRTC-Gerüst (build-only): react-native-webrtc + @config-plugins/react-native-webrtc + expo-dev-client, Signaling-Relay {type:"signal"} über WebSocket, src/webrtc mit Web-Stub. Volles Live-Video erst nach Native-Build. [done]
- Getestet: Backend 15/15 (+12/12) pytest bestanden; alle Frontend-Flows vom Testing-Agent bestätigt; keine kritischen Bugs.

## Implemented (2026-06, update 4 — UGC-Safety / App-Store-Compliance)
- EULA-Gate beim allerersten Start (src/components/EulaGate, storage-Flag "sugar_eula_accepted") mit Zustimmungstext + Zero-Tolerance-Regeln; App erst nach „Akzeptieren" nutzbar. [done]
- Melden & Blockieren im Video-Stage (Rail Chat/Melden/Block) – gut sichtbar. [done]
- Report/Block-Logik: sofortiges Trennen der Verbindung; blockierte ID wird persistiert (user.blocked) und vom Matchmaking dauerhaft ignoriert (_compatible). Melden blockiert jetzt ebenfalls. [done]
- Account-Löschung (Apple-Pflicht): /settings mit rotem „Account unwiderruflich löschen" + Bestätigung; DELETE /api/account löscht User, Swipes, Matches, Messages, Reports; lokale Daten werden zurückgesetzt. Verlinkt aus Profil. [done]
- Permission-Strings (app.json): NSCamera/NSMicrophone + expo-camera Plugin mit exaktem Text „Sugar benötigt Zugriff auf deine Kamera und dein Mikrofon…". [done]
- Verifiziert: DELETE /api/account (200, User weg, Login danach 401); EULA erscheint beim ersten Start und schaltet nach Zustimmung frei.

## Implemented (2026-06, update 5 — Store-Compliance II)
- 18+ Alters-Gate: nach EULA-Zustimmung Geburtsdatum-Abfrage (TT/MM/JJJJ) im EulaGate; unter 18 wird blockiert; lokal gespeichert ("sugar_birthdate"). [done]
- Foto-Moderation: POST /api/profile/photo prüft jedes neue Foto per Vision-LLM (Emergent-Key, openai gpt-5.4) auf Nacktheit/expliziten Inhalt; abgelehnte Fotos werden nicht gespeichert. /profile/verify lehnt explizite Selfies ab (422). [done]
- Admin-Meldungen: is_admin-Flag + Auto-Seed admin@sugar.app/admin1234; /admin-Screen (aus Profil) listet Reports; GET /api/admin/reports, POST /api/admin/reports/{id}/resolve {dismiss|ban}; Ban setzt user.banned → Login 403. Nicht-Admins erhalten 403. [done]
- Rechtstexte: /legal/terms (AGB) & /legal/privacy (Datenschutz) als eigene Seiten, verlinkt aus Settings. [done]
- Report blockiert jetzt zusätzlich; Melden beendet Call + dauerhaftes Ignorieren.
- Getestet: 9/9 neue Safety-Tests + 15/15 Feature-Tests bestanden; Age-Gate & Admin-Ban UI/Backend verifiziert; keine Regressionen.

## Backlog (prioritized)
### P0
- Real WebRTC video (react-native-webrtc) — requires deploy + native build; wire signaling over existing WebSocket.
### P1
- Text chat overlay during a match; report/block for safety.
- Gender/preference filtering in the matching queue.
### P2
- Likes/favorites to reconnect with a past match; profile bio + multiple photos.
- Interests/tags-based smarter matching.

## Next Tasks
1. Integrate real WebRTC once user deploys and generates a native build.
2. Add report/block + text chat on the stage.
3. Add preference-based matching (who you want to meet).

## Update 6 — Candy / Kawaii Visual Redesign (shipped, agent-verified)
Full visual restyle to a glossy pastel "candy" aesthetic (logic unchanged).
- Theme (`src/theme.ts`): candy palette (cotton-candy pink #FF528A, mint #98F5E1, lavender #D4C4FB, lemon #FDF07B, deep-berry text #4A2E3B), `gradients` recipes, `candyShadow()`. Radius softened (sm12/md20/lg28).
- Fonts (`src/hooks/use-app-fonts.ts`): Fredoka (display) + Nunito (body) via fontsource CDN; theme font keys remapped so all screens update automatically.
- New reusable components in `src/components/`:
  - `CandyLogo.tsx` — react-native-svg candy-cane striped heart + "Sugar" icing wordmark.
  - `LollipopLoader.tsx` — reanimated spinning SVG lollipop spinner.
  - `GummyButton.tsx` — glossy neumorphic candy CTA (gradient gloss overlay + colored shadow).
  - `RainbowAvatar.tsx` — LinearGradient rainbow ring around avatar/photo.
  - `CandyBackground.tsx` — marshmallow-melt gradient.
- Installed `react-native-svg`.
- Applied to: `_layout.tsx` (surface bg), `index.tsx` (lollipop loader), `login.tsx` (candy bg + logo + gummy CTA), `EulaGate.tsx` (light candy gate + logo), `(tabs)/profile.tsx` (rainbow avatar + gummy save). All other screens inherit the new palette/fonts automatically.
- Also completed earlier update-5 request: profile Religion/Hobby/Job fields + Skip, story viewer modal, Impressum screen + Settings link, age keyboard-dismiss.
- Verified: lint clean; screenshots of EULA gate, login, discover, profile all render the candy theme correctly.

