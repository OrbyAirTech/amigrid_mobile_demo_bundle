import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { saveClipToGallery } from '@/data/clipSave';
import { canRecordClips, startStreamClip, stopStreamClip } from '@/data/livekit';
import { colors, fonts, radius, typography } from '@/theme';
import { impactLight, impactMedium, notifySuccess, notifyWarning } from '@/utils/haptics';
import { GlassSurface } from './GlassSurface';

const MAX_MS = 15_000;
const MIN_MS = 800;

type Phase = 'idle' | 'starting' | 'recording' | 'saving';
type Props = { streamId: string; tone?: 'light' | 'dark'; onResult: (message: string) => void };

const clock = (ms: number) => `0:${String(Math.min(99, Math.floor(ms / 1000))).padStart(2, '0')}`;

/**
 * Hold to record a short clip of the live stream to the gallery. Press down: a medium tap, recording starts.
 * Let go: a success tap, the clip is saved. At 15 seconds it stops by itself. The recording and the file are
 * handled by the native module on its own thread, so holding doesn't slow the video or the screen.
 */
export function HoldToRecordButton({ streamId, tone = 'light', onResult }: Props) {
  const [phase, setPhaseState] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const phaseRef = useRef<Phase>('idle');
  const held = useRef(false);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };

  const finish = useCallback(
    async (auto = false) => {
      if (phaseRef.current !== 'recording') return;
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      const length = Date.now() - startedAt.current;
      setPhase('saving');
      if (auto) notifyWarning();
      else impactLight();
      const clip = await stopStreamClip();
      if (!clip || length < MIN_MS || clip.durationMs < MIN_MS - 200) {
        setPhase('idle');
        onResult(clip ? 'Hold a little longer to record a clip' : 'Couldn’t record this clip');
        return;
      }
      const saved = await saveClipToGallery(clip.uri);
      setPhase('idle');
      if (saved === 'saved') {
        notifySuccess();
        onResult('Clip saved to your gallery');
      } else {
        onResult(saved === 'denied' ? 'Allow gallery access in Settings to save clips' : 'Couldn’t save the clip');
      }
    },
    [onResult],
  );

  const begin = async () => {
    if (phaseRef.current !== 'idle') return;
    if (!canRecordClips) {
      onResult('Recording needs the latest app build');
      return;
    }
    held.current = true;
    impactMedium();
    setPhase('starting');
    const ok = await startStreamClip(streamId);
    if (!ok) {
      held.current = false;
      setPhase('idle');
      onResult('Couldn’t start recording');
      return;
    }
    startedAt.current = Date.now();
    setElapsed(0);
    setPhase('recording');
    timer.current = setInterval(() => {
      const ms = Date.now() - startedAt.current;
      setElapsed(ms);
      if (ms >= MAX_MS) void finish(true);
    }, 100);
    if (!held.current) void finish(); // let go while it was still starting
  };

  const end = () => {
    held.current = false;
    void finish();
  };

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      if (phaseRef.current === 'recording') void stopStreamClip(); // left the screen mid-clip: close the file
    },
    [],
  );

  const on = phase === 'recording';
  return (
    <Pressable
      onPressIn={begin}
      onPressOut={end}
      accessibilityRole="button"
      accessibilityLabel="Hold to record a clip"
      accessibilityHint="Press and hold to record. Let go to save the clip to your gallery."
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <GlassSurface tone={tone} radius={radius.md} raised contentStyle={[styles.body, on && styles.on]}>
        <Feather name={on ? 'circle' : 'video'} size={on ? 14 : 18} color={on ? colors.white : colors.ink} />
        <Text style={[typography.cardBody, styles.text, on && { color: colors.white }]}>
          {on ? clock(elapsed) : phase === 'saving' ? 'Saving…' : 'Hold to record'}
        </Text>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, paddingHorizontal: 14 },
  on: { backgroundColor: colors.danger },
  text: { color: colors.ink, fontFamily: fonts.bold },
});
