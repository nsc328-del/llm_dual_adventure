interface SoundToggleProps {
  isMuted: boolean;
  onToggle: () => void;
}

export function SoundToggle({ isMuted, onToggle }: SoundToggleProps) {
  return (
    <button
      className="pixel-btn text-xs"
      onClick={onToggle}
      title={isMuted ? 'Unmute ambient sound' : 'Mute ambient sound'}
      aria-label={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? '\u{1F507}' : '\u{1F50A}'}
    </button>
  );
}
