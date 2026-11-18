import { memo } from 'react';
import TrackRow from './TrackRow';
import type { Track } from '../types';

interface SoundCloudTrackCardProps {
  track: Track;
  index?: number;
  queue?: Track[];
  showStats?: boolean;
  onPlay?: (track: Track, queue: Track[]) => void;
  repostedBy?: string;
  className?: string;
}

export default memo(function SoundCloudTrackCard({
  track,
  index,
  queue,
  showStats = true,
  onPlay,
  repostedBy,
  className = '',
}: SoundCloudTrackCardProps) {
  return (
    <TrackRow
      track={track}
      index={index}
      queue={queue}
      showStats={showStats}
      onPlay={onPlay}
      repostedBy={repostedBy}
      className={className}
    />
  );
});
