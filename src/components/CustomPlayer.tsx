import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useActiveVideo } from '../context/VideoContext';
import { SHOWCASE_MP4S } from '../data/showcaseVideos';

interface CustomPlayerProps {
  url: string;
  playing?: boolean;
  muted?: boolean;
  loop?: boolean;
  columnIndex?: number;
}



export default function CustomPlayer({ url, playing: defaultPlaying = false, muted: defaultMuted = true, loop = true, columnIndex }: CustomPlayerProps) {
  const [playing, setPlaying] = useState(defaultPlaying);
  const [muted, setMuted] = useState(defaultMuted);
  const [volume, setVolume] = useState(0.8);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Use context for global video state
  const videoContext = useActiveVideo();
  const activeVideo = videoContext?.activeVideo;
  const setActiveVideo = videoContext?.setActiveVideo;
  const setPlayingColumnIndex = videoContext?.setPlayingColumnIndex;

  const videoUrl = SHOWCASE_MP4S[url] || url;

  // Pause if another video starts playing
  useEffect(() => {
    if (activeVideo && activeVideo !== url && playing) {
      setPlaying(false);
    }
  }, [activeVideo, url, playing]);

  useEffect(() => {
    if (!videoRef.current) return;
    
    // Sync React state to native video
    videoRef.current.volume = volume;
    videoRef.current.muted = muted;
    
    if (playing) {
      // Catch DOMException from rapid play/pause
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play was prevented or interrupted, silence the error
        });
      }
      if (setActiveVideo) setActiveVideo(url);
      if (setPlayingColumnIndex && columnIndex !== undefined) {
        setPlayingColumnIndex(columnIndex);
      }
    } else {
      videoRef.current.pause();
      if (activeVideo === url) {
         if (setActiveVideo) setActiveVideo(null);
         if (setPlayingColumnIndex) setPlayingColumnIndex(null);
      }
    }
  }, [playing, volume, muted, url, activeVideo, setActiveVideo, setPlayingColumnIndex, columnIndex]);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPlaying(!playing);
  };

  return (
    <div className="relative w-full h-full group bg-black overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover opacity-90 transition-opacity duration-300"
          loop={loop}
          playsInline
          muted={muted}
        />
      </div>
      
      {/* Custom Controls Overlay - Glassmorphic */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-auto">
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-[#ffffff1a] hover:bg-[#ffffff33] border border-[#ffffff33] flex items-center justify-center backdrop-blur-md text-[#fff] transition-all focus:outline-none"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
        </button>

        <div className="flex items-center gap-2 group/volume">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMuted(!muted); }}
            className="w-8 h-8 rounded-full bg-[#ffffff1a] hover:bg-[#ffffff33] border border-[#ffffff33] flex items-center justify-center backdrop-blur-md text-[#fff] transition-all focus:outline-none"
          >
            {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {/* Volume slider only shows on hover of the volume area on desktop, or just keep it small */}
          <div className="w-0 overflow-hidden group-hover/volume:w-16 transition-all duration-300 ease-in-out opacity-0 group-hover/volume:opacity-100 flex items-center">
             <input
               type="range"
               min={0}
               max={1}
               step="any"
               value={muted ? 0 : volume}
               onChange={(e) => {
                 setVolume(parseFloat(e.target.value));
                 setMuted(false);
               }}
               className="w-16 h-1 rounded-full appearance-none bg-[#ffffff33] accent-[#fff] cursor-pointer"
               onClick={(e) => e.stopPropagation()}
             />
          </div>
        </div>
      </div>

      {/* Big Play Button Overlay for Initial State (Glass Theme) */}
      {!playing && (
        <div
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPlaying(true); }}
          className="absolute inset-0 flex items-center justify-center bg-black/10 cursor-pointer pointer-events-auto z-[5] transition-colors hover:bg-black/20"
        >
          <div className="w-14 h-14 bg-black/50 text-[#fff] border border-[#ffffff4d] flex items-center justify-center backdrop-blur-md hover:bg-[#fff] hover:text-black transition-all">
            <Play className="w-6 h-6 ml-1" fill="currentColor" />
          </div>
        </div>
      )}
    </div>
  );
}
