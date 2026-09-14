// Bộ phát âm thanh chuông báo order mới dùng Web Audio API
class SoundManager {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public unlock(): boolean {
    try {
      const ctx = this.getAudioContext();
      this.isUnlocked = true;
      this.playChime(true); // Phát thử âm ngắn để mở khóa
      return true;
    } catch (e) {
      console.warn('Không thể mở khóa audio context', e);
      return false;
    }
  }

  public getUnlockedStatus(): boolean {
    return this.isUnlocked;
  }

  // Phát tiếng chuông "ting" hai nốt trong trẻo ấm áp báo đơn mới
  public playChime(isTest: boolean = false): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Nốt 1: E6 (1318.5 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1318.5, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.35, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + (isTest ? 0.3 : 0.6));

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + (isTest ? 0.3 : 0.6));

      if (!isTest) {
        // Nốt 2: A6 (1760 Hz) ngân vang hơn
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1760, now + 0.12);

        gain2.gain.setValueAtTime(0, now + 0.12);
        gain2.gain.linearRampToValueAtTime(0.4, now + 0.14);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.start(now + 0.12);
        osc2.stop(now + 1.2);
      }
    } catch (err) {
      console.error('Lỗi khi phát chuông báo', err);
    }
  }

  public playNewOrderBell(): void {
    this.playChime(false);
  }
}

export const soundManager = new SoundManager();
