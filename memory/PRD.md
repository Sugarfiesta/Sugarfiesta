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
