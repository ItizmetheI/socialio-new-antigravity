import React, { createContext, useContext, useState } from 'react';

type ActiveVideoContextType = {
  activeVideo: string | null;
  setActiveVideo: (url: string | null) => void;
  playingColumnIndex: number | null;
  setPlayingColumnIndex: (index: number | null) => void;
};

const ActiveVideoContext = createContext<ActiveVideoContextType>({
  activeVideo: null,
  setActiveVideo: () => {},
  playingColumnIndex: null,
  setPlayingColumnIndex: () => {},
});

export const useActiveVideo = () => useContext(ActiveVideoContext);

export const ActiveVideoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [playingColumnIndex, setPlayingColumnIndex] = useState<number | null>(null);

  return (
    <ActiveVideoContext.Provider value={{ activeVideo, setActiveVideo, playingColumnIndex, setPlayingColumnIndex }}>
      {children}
    </ActiveVideoContext.Provider>
  );
};
