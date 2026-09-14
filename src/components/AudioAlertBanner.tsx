'use client';

import { useState, useEffect } from 'react';
import { soundManager } from '@/lib/audio';
import { Volume2, VolumeX, Bell } from 'lucide-react';

export default function AudioAlertBanner() {
  const [unlocked, setUnlocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setUnlocked(soundManager.getUnlockedStatus());
  }, []);

  const handleEnableAudio = () => {
    const ok = soundManager.unlock();
    if (ok) {
      setUnlocked(true);
      setDismissed(true);
    }
  };

  if (unlocked || dismissed) return null;

  return (
    <div className="bg-pine-deep text-kraft px-4 py-3 shadow-md border-b border-brass flex items-center justify-between gap-3 sticky top-0 z-50 animate-fadeIn">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-brass/20 flex items-center justify-center text-brass">
          <Bell className="w-4 h-4 animate-bounce" />
        </div>
        <div>
          <p className="text-xs md:text-sm font-semibold text-kraft-card">
            Bật âm thanh chuông báo đơn mới
          </p>
          <p className="text-[11px] text-kraft-dark">
            Trình duyệt cần quyền tương tác để phát tiếng "ting" khi khách gọi món
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleEnableAudio}
          className="px-3.5 py-1.5 bg-brass hover:bg-brass-soft text-pine font-bold text-xs rounded-full shadow transition flex items-center gap-1.5 tap-active"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Bật chuông</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 text-kraft-dark hover:text-kraft rounded"
          title="Bỏ qua"
        >
          <VolumeX className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
