import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useActiveVideo } from '../context/VideoContext';

interface CustomPlayerProps {
  url: string;
  playing?: boolean;
  muted?: boolean;
  loop?: boolean;
  columnIndex?: number;
}

// Temporary mapping to direct MP4s for the prototype
const directMp4s: Record<string, string> = {
  'https://streamable.com/a69bm3': 'https://cdn-cf-east.streamable.com/video/mp4/a69bm3.mp4?Expires=1780657705433&Key-Pair-Id=APKAIEYUVEN4EVB2OKEQ&Signature=HIGdSlJnrvmjwghorqzU0mW~Ij0ERXXoaR5IhUE6wA0SSsplGVhWffGMcj-jaBOw6K32qE1kq93HXRfXPwg8sL2Ceav3y0B9haZTu8hosk-OZ2uYCAfEQaWbz24qF9ItBGER4jDOCedvlSCAFOkRuTOnB0d01JGjQgmhsRSlZ3EvWOhgzBKpG7AqHw~6vj1vnpAj3Wvmsnklla~CVVx09GPKXOeSvPR8DqEOrQUICD1L9bnewAcVa~2X74uVhVJUfB7ADqGQIn21h71EQccbYx5wZJ49eU6visnFfpZGDMSsefRtI50Tybhm-t67EtvQaN4t73P4eSDvvWrriT0xvA__',
  'https://streamable.com/30ffri': 'https://cdn-cf-east.streamable.com/video/mp4/30ffri.mp4?Expires=1780657705769&Key-Pair-Id=APKAIEYUVEN4EVB2OKEQ&Signature=nFsV0uv-XI~KiRtpGSVBxcNsA1Gzc6Gs5gSFE~QClEucBe8VnTd8f73pkZXKPPpZM5QkGjHRL0dJV2EcpL3uudlmF9--QFi~OXkZeGtOGQ4GnSzkn4e8WinLZOAaMcHXzBsLT1SJ0IaVndnWw5z0L2BqlyNj7ny6wx7InbFBgkkx4IAwNufUWkv4iy4qIj30b88qFNpWVK6tbFahHS5y0HtANR8XHapls0uCVb5JfMO3Ytt-sfqzNXPpRuvTuvzC7qI99VlhLMcvjUbhEk2mzUhla6P~bXuS9FL2f6io~hvqR3eKEeyTLi1BIVi3zuut8CNSqHNgqCqT6APpt1R6wQ__',
  'https://streamable.com/e25yp1': 'https://cdn-cf-east.streamable.com/video/mp4/e25yp1.mp4?Expires=1780657706083&Key-Pair-Id=APKAIEYUVEN4EVB2OKEQ&Signature=go07EuJytICPAOlA3KRUkrNBauC8v6CW-nDd-xjIvTx6nifGA243AWyI7kihiZYbabcT6cZoQ9k0nDfFo9kwpFSY5cuumBTLjqfFzPcCFcDG7WdSDjwMUTokFujlxWIwD-xCYpH9Lxr3gxur7mnEj031dQebIR~uh4r3PnQk03SkldD5TzUIvZ0YSyDWgd3yJ5Oy-fNEO7UNX5i7DBF595qeVnYr9pVXyJXjUfqjZGu2lTGKQUjkzoZQ3RKl0V1KGt4MrOw23RBVjFqnM6Ddhd~VDKxOn7d7gQdDsV7uUEMM244IOkpGAl~67~fbORUTaWUwP3IgzrebUQ--Nneo2g__',
  'https://streamable.com/e3xzs4': 'https://cdn-cf-east.streamable.com/video/mp4/e3xzs4.mp4?Expires=1780657706442&Key-Pair-Id=APKAIEYUVEN4EVB2OKEQ&Signature=VBIrwCAim679MGq3N9mTVd-C3xU4zQRUb~mz141WV~~Hxjx-tk4Lym-t~QgZeogCBiHyZLYabYMS~2O3kIcb2Y7e94tWqVRnxg2G9~yokHhljTW1xXLGE-zrvFa-i-i5EMWVV5LdlbqFPxB4-0gLy8oLAApWaUAURd3ikeyHiMibX9d3AYQjOp-HdT25yPiYubfYBkFbaO3i6h6wVMH9wvb1MFjDUWIdyJdQdVcPCEJjBPreTy2EQcPN0ax4SaeHP9MJeelA4GIrB~aWcxEEoq3fjbKEvEn2clz8guFyVls4dCVhotlZzvrb5JRtUVPkESZgQlnGtcKkLMWZDa9F-g__'
};

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

  const videoUrl = directMp4s[url] || url;

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
