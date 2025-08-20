import { useContext } from 'react';
import { WorldContext } from '../state/WorldManager';

const useWorldManager = () => {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error('WorldManagerProvider missing');
  return ctx;
};

export default useWorldManager;
