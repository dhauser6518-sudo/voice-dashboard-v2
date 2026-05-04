'use client';

interface AudioPlayerProps {
  url: string | null;
}

export default function AudioPlayer({ url }: AudioPlayerProps) {
  if (!url) return <span className="text-xs text-gray-400">No recording</span>;
  return (
    <audio controls preload="none" className="h-8 w-full max-w-xs">
      <source src={url} type="audio/mpeg" />
    </audio>
  );
}
