import { useState, useEffect, useCallback, useRef } from 'react';
import type { ThemeId } from '@shared/types.js';

const MUTE_KEY = 'dual-adventure-muted';
const MASTER_VOLUME = 0.12;
const CROSSFADE_MS = 1000;

type SoundBuilder = (ctx: AudioContext, master: GainNode) => (() => void);

/* ---------- per-theme sound generators ---------- */

function buildForest(ctx: AudioContext, master: GainNode): () => void {
  const stops: (() => void)[] = [];

  // gentle wind: low-frequency filtered noise via oscillator modulation
  const windOsc = ctx.createOscillator();
  windOsc.type = 'sine';
  windOsc.frequency.value = 240;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.08;
  const windLfo = ctx.createOscillator();
  windLfo.type = 'sine';
  windLfo.frequency.value = 0.3;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 60;
  windLfo.connect(lfoGain);
  lfoGain.connect(windOsc.frequency);
  windOsc.connect(windGain);
  windGain.connect(master);
  windOsc.start();
  windLfo.start();
  stops.push(() => { windOsc.stop(); windLfo.stop(); });

  // bird chirps: random high-frequency pips
  let birdTimer: ReturnType<typeof setTimeout> | null = null;
  function chirp() {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const freq = 1800 + Math.random() * 1400;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(g);
    g.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
    birdTimer = setTimeout(chirp, 2000 + Math.random() * 5000);
  }
  birdTimer = setTimeout(chirp, 1000 + Math.random() * 2000);
  stops.push(() => { if (birdTimer !== null) clearTimeout(birdTimer); });

  return () => stops.forEach(fn => fn());
}

function buildOcean(ctx: AudioContext, master: GainNode): () => void {
  const stops: (() => void)[] = [];

  // wave sweep: sine oscillator with slow LFO on gain
  const waveOsc = ctx.createOscillator();
  waveOsc.type = 'sine';
  waveOsc.frequency.value = 120;
  const waveGain = ctx.createGain();
  waveGain.gain.value = 0;
  const waveLfo = ctx.createOscillator();
  waveLfo.type = 'sine';
  waveLfo.frequency.value = 0.12;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.1;
  waveLfo.connect(lfoGain);
  lfoGain.connect(waveGain.gain);
  waveOsc.connect(waveGain);
  waveGain.connect(master);
  waveOsc.start();
  waveLfo.start();
  stops.push(() => { waveOsc.stop(); waveLfo.stop(); });

  // secondary deeper tone
  const subOsc = ctx.createOscillator();
  subOsc.type = 'sine';
  subOsc.frequency.value = 80;
  const subGain = ctx.createGain();
  subGain.gain.value = 0.06;
  subOsc.connect(subGain);
  subGain.connect(master);
  subOsc.start();
  stops.push(() => subOsc.stop());

  // bubbles: random short high pips
  let bubbleTimer: ReturnType<typeof setTimeout> | null = null;
  function bubble() {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600 + Math.random() * 800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.04, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(g);
    g.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
    bubbleTimer = setTimeout(bubble, 1500 + Math.random() * 4000);
  }
  bubbleTimer = setTimeout(bubble, 800 + Math.random() * 2000);
  stops.push(() => { if (bubbleTimer !== null) clearTimeout(bubbleTimer); });

  return () => stops.forEach(fn => fn());
}

function buildMech(ctx: AudioContext, master: GainNode): () => void {
  const stops: (() => void)[] = [];

  // mechanical hum: sawtooth drone
  const droneOsc = ctx.createOscillator();
  droneOsc.type = 'sawtooth';
  droneOsc.frequency.value = 55;
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.04;
  // low-pass filter to tame harshness
  const droneLp = ctx.createBiquadFilter();
  droneLp.type = 'lowpass';
  droneLp.frequency.value = 300;
  droneOsc.connect(droneLp);
  droneLp.connect(droneGain);
  droneGain.connect(master);
  droneOsc.start();
  stops.push(() => droneOsc.stop());

  // secondary hum
  const hum2 = ctx.createOscillator();
  hum2.type = 'sawtooth';
  hum2.frequency.value = 82;
  const hum2Gain = ctx.createGain();
  hum2Gain.gain.value = 0.025;
  const hum2Lp = ctx.createBiquadFilter();
  hum2Lp.type = 'lowpass';
  hum2Lp.frequency.value = 250;
  hum2.connect(hum2Lp);
  hum2Lp.connect(hum2Gain);
  hum2Gain.connect(master);
  hum2.start();
  stops.push(() => hum2.stop());

  // steam hiss bursts: noise-like via high-frequency oscillator
  let hissTimer: ReturnType<typeof setTimeout> | null = null;
  function hiss() {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 4000 + Math.random() * 3000;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 5000;
    bp.Q.value = 0.5;
    const g = ctx.createGain();
    const dur = 0.08 + Math.random() * 0.12;
    g.gain.setValueAtTime(0.03, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(bp);
    bp.connect(g);
    g.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.01);
    hissTimer = setTimeout(hiss, 3000 + Math.random() * 6000);
  }
  hissTimer = setTimeout(hiss, 1500 + Math.random() * 3000);
  stops.push(() => { if (hissTimer !== null) clearTimeout(hissTimer); });

  return () => stops.forEach(fn => fn());
}

function buildCyber(ctx: AudioContext, master: GainNode): () => void {
  const stops: (() => void)[] = [];

  // synth pad: two detuned oscillators
  const pad1 = ctx.createOscillator();
  pad1.type = 'sine';
  pad1.frequency.value = 220;
  const pad2 = ctx.createOscillator();
  pad2.type = 'sine';
  pad2.frequency.value = 223; // slight detune for shimmer
  const padGain = ctx.createGain();
  padGain.gain.value = 0.06;
  pad1.connect(padGain);
  pad2.connect(padGain);
  padGain.connect(master);
  pad1.start();
  pad2.start();
  stops.push(() => { pad1.stop(); pad2.stop(); });

  // sub-bass layer
  const sub = ctx.createOscillator();
  sub.type = 'triangle';
  sub.frequency.value = 110;
  const subGain = ctx.createGain();
  subGain.gain.value = 0.03;
  sub.connect(subGain);
  subGain.connect(master);
  sub.start();
  stops.push(() => sub.stop());

  // digital blips: random square wave pings
  let blipTimer: ReturnType<typeof setTimeout> | null = null;
  function blip() {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 800 + Math.random() * 2000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(g);
    g.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
    blipTimer = setTimeout(blip, 1000 + Math.random() * 4000);
  }
  blipTimer = setTimeout(blip, 500 + Math.random() * 2000);
  stops.push(() => { if (blipTimer !== null) clearTimeout(blipTimer); });

  return () => stops.forEach(fn => fn());
}

function buildWestern(ctx: AudioContext, master: GainNode): () => void {
  const stops: (() => void)[] = [];

  // low brass drone: filtered triangle wave
  const droneOsc = ctx.createOscillator();
  droneOsc.type = 'triangle';
  droneOsc.frequency.value = 98; // roughly G2
  const droneLp = ctx.createBiquadFilter();
  droneLp.type = 'lowpass';
  droneLp.frequency.value = 400;
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.07;
  droneOsc.connect(droneLp);
  droneLp.connect(droneGain);
  droneGain.connect(master);
  droneOsc.start();
  stops.push(() => droneOsc.stop());

  // second harmonic
  const drone2 = ctx.createOscillator();
  drone2.type = 'triangle';
  drone2.frequency.value = 147; // roughly D3
  const drone2Gain = ctx.createGain();
  drone2Gain.gain.value = 0.03;
  drone2.connect(droneLp);
  droneLp.connect(drone2Gain);
  drone2Gain.connect(master);
  drone2.start();
  stops.push(() => drone2.stop());

  // crackling fire: random short noise-like bursts
  let crackleTimer: ReturnType<typeof setTimeout> | null = null;
  function crackle() {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 2000 + Math.random() * 4000;
    const bp = ctx.createBiquadFilter();
    bp.type = 'highpass';
    bp.frequency.value = 3000;
    const g = ctx.createGain();
    const dur = 0.02 + Math.random() * 0.04;
    g.gain.setValueAtTime(0.025, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(bp);
    bp.connect(g);
    g.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.01);
    crackleTimer = setTimeout(crackle, 100 + Math.random() * 400);
  }
  crackleTimer = setTimeout(crackle, 200 + Math.random() * 500);
  stops.push(() => { if (crackleTimer !== null) clearTimeout(crackleTimer); });

  return () => stops.forEach(fn => fn());
}

const BUILDERS: Record<ThemeId, SoundBuilder> = {
  forest: buildForest,
  ocean: buildOcean,
  mech: buildMech,
  cyber: buildCyber,
  western: buildWestern,
};

/* ---------- hook ---------- */

export function useSound() {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MUTE_KEY) === '1';
    }
    return false;
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const activeThemeRef = useRef<ThemeId | null>(null);
  const startedRef = useRef(false);

  // Initialise AudioContext on first user interaction
  const ensureContext = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = isMuted ? 0 : MASTER_VOLUME;
    master.connect(ctx.destination);
    ctxRef.current = ctx;
    masterRef.current = master;
    return ctx;
  }, [isMuted]);

  // Auto-start on first click
  useEffect(() => {
    if (startedRef.current) return;
    const handler = () => {
      startedRef.current = true;
      ensureContext();
      // Resume context if suspended (autoplay policy)
      if (ctxRef.current?.state === 'suspended') {
        ctxRef.current.resume();
      }
      // If a theme was already set, start it
      if (activeThemeRef.current) {
        const theme = activeThemeRef.current;
        activeThemeRef.current = null; // reset so setThemeSound will trigger
        startTheme(theme);
      }
      document.removeEventListener('click', handler);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startTheme(theme: ThemeId) {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;

    // Already playing this theme
    if (activeThemeRef.current === theme) return;

    // Fade out old sound
    if (stopRef.current) {
      const oldStop = stopRef.current;
      const oldGain = master.gain.value;
      master.gain.setValueAtTime(oldGain, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + CROSSFADE_MS / 1000);
      setTimeout(() => {
        oldStop();
      }, CROSSFADE_MS);
    }

    activeThemeRef.current = theme;

    // Build and fade in new sound after crossfade
    const delay = stopRef.current ? CROSSFADE_MS : 0;
    setTimeout(() => {
      if (activeThemeRef.current !== theme) return; // theme changed while waiting
      const stop = BUILDERS[theme](ctx, master);
      stopRef.current = stop;
      const targetVol = isMuted ? 0 : MASTER_VOLUME;
      master.gain.setValueAtTime(0, ctx.currentTime);
      master.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + CROSSFADE_MS / 1000);
    }, delay);
  }

  const setThemeSound = useCallback((theme: ThemeId) => {
    if (!startedRef.current) {
      // AudioContext not yet created; remember for later
      activeThemeRef.current = theme;
      return;
    }
    startTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      const master = masterRef.current;
      const ctx = ctxRef.current;
      if (master && ctx) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(
          next ? 0 : MASTER_VOLUME,
          ctx.currentTime + 0.15,
        );
      }
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRef.current?.();
      ctxRef.current?.close();
    };
  }, []);

  return { isMuted, toggleMute, setThemeSound };
}
