// WebRTC helper — only functional in a NATIVE dev/production build.
// react-native-webrtc is NOT available in Expo Go / web preview, so we lazy-require it
// and expose an availability check. The Video Stage keeps its demo feed until this is
// available (after `expo prebuild` + a native build). Signaling is relayed over the
// existing WebSocket ({ type: "signal", data }).

let mod: any = null;
let tried = false;

export function getWebRTC(): any {
  if (tried) return mod;
  tried = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("react-native-webrtc");
  } catch {
    mod = null;
  }
  return mod;
}

export function isWebRTCAvailable(): boolean {
  const m = getWebRTC();
  return !!(m && m.mediaDevices && m.RTCPeerConnection);
}

const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

// Minimal peer helper used by native builds. Returns { pc, localStream } or null.
export async function createPeer(
  onRemoteStream: (stream: any) => void,
  onIce: (candidate: any) => void
): Promise<{ pc: any; localStream: any } | null> {
  const m = getWebRTC();
  if (!isWebRTCAvailable()) return null;
  const localStream = await m.mediaDevices.getUserMedia({ audio: true, video: { facingMode: "user" } });
  const pc = new m.RTCPeerConnection(ICE);
  localStream.getTracks().forEach((t: any) => pc.addTrack(t, localStream));
  pc.ontrack = (e: any) => {
    if (e.streams && e.streams[0]) onRemoteStream(e.streams[0]);
  };
  pc.onicecandidate = (e: any) => {
    if (e.candidate) onIce(e.candidate);
  };
  return { pc, localStream };
}
