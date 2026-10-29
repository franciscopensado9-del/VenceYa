import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <aside aria-label="Modo sin conexión" className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-xl bg-[#FFF3D9] px-3.5 py-2 text-xs font-medium text-[#A66B16] shadow-md border border-[#F2DEB0]">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Modo sin conexión — VenceYa funciona 100% con tu base local</span>
    </aside>
  );
};
