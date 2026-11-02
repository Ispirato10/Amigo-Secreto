// Festive Web Audio API Synthesizer
// Pure browser-native, zero dependencies, zero network requests, zero latency

class FestiveAudioService {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // Check localStorage for mute preference
    if (typeof window !== 'undefined') {
      this.muted = localStorage.getItem('amigo-secreto-muted') === 'true';
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('amigo-secreto-muted', muted ? 'true' : 'false');
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private getAudioContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch (e) {
      console.warn('Web Audio not available:', e);
      return null;
    }
  }

  /**
   * Helper to play a chime bell note with realistic metallic/celesta harmonic overtones
   */
  private playBellNote(
    ctx: AudioContext, 
    freq: number, 
    startTime: number, 
    duration: number, 
    gainValue = 0.18
  ) {
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Harmonic bell shimmer (2.76x frequency creates typical holiday celesta/glockenspiel tone)
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2.76, startTime);

    // Envelope
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gainNode);
    overtone.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    overtone.start(startTime);
    osc.stop(startTime + duration + 0.05);
    overtone.stop(startTime + duration + 0.05);
  }

  /**
   * 1. Efeito: 'Cadastro Realizado'
   * Arpejo natalino brilhante de boas-vindas (C5, E5, G5, C6) com sininhos celestiais
   */
  public playRegistrationSuccess(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime + 0.05;
    // C5, E5, G5, C6 (Do, Mi, Sol, Do maior - harmonia alegre)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      this.playBellNote(ctx, freq, now + idx * 0.1, 1.2, 0.22);
    });

    // Toque extra de sininho agudo no final (E6)
    this.playBellNote(ctx, 1318.51, now + 0.42, 1.4, 0.15);
  }

  /**
   * 2. Efeito: 'Entrada na Sala'
   * Acorde festivo acolhedor com sino duplo e vibração de recepção mágica
   */
  public playRoomEntry(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime + 0.05;
    // Doce saudação de porta natalina (A4 -> C#5 -> E5 -> A5)
    const notes = [440.00, 554.37, 659.25, 880.00];
    notes.forEach((freq, idx) => {
      this.playBellNote(ctx, freq, now + idx * 0.12, 1.5, 0.2);
    });

    // Eco de carrilhão natalino
    this.playBellNote(ctx, 1108.73, now + 0.5, 1.6, 0.12);
  }

  /**
   * 3. Efeito: 'Sorteio Finalizado' / Revelação do Amigo Secreto
   * Fanfarra triunfante de Natal com cascata de sinos de vitória e celebração
   */
  public playDrawFinished(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime + 0.05;
    // Fanfarra clássica natalina triunfal: G4 -> C5 -> E5 -> G5 -> C6
    const fanfare = [
      { f: 392.00, t: 0.0, d: 0.25 },
      { f: 523.25, t: 0.15, d: 0.3 },
      { f: 659.25, t: 0.3, d: 0.35 },
      { f: 783.99, t: 0.45, d: 0.4 },
      { f: 1046.50, t: 0.65, d: 2.2 }, // Clímax Do maior
      { f: 1318.51, t: 0.72, d: 2.0 }, // Mi maior harmônico
      { f: 1567.98, t: 0.8, d: 2.2 },  // Sol agudo estelar
    ];

    fanfare.forEach((item) => {
      this.playBellNote(ctx, item.f, now + item.t, item.d, 0.25);
    });
  }

  /**
   * 4. Efeito rápido: 'Sino de Natal' / Ding decorativo interativo
   */
  public playJingle(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime + 0.02;
    this.playBellNote(ctx, 1046.50, now, 0.8, 0.18);
    this.playBellNote(ctx, 1318.51, now + 0.08, 0.9, 0.18);
    this.playBellNote(ctx, 1567.98, now + 0.16, 1.2, 0.22);
  }

  /**
   * 5. Efeito: 'Lista de Presentes Salva com Sucesso'
   * Arpejo natalino alegre de caixas de presente (Jingle Bells chimes)
   */
  public playGiftsSaved(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime + 0.05;
    // Jingle bells sequence (E5, E5, E5, G5, C6)
    const notes = [
      { f: 659.25, t: 0.0, d: 0.22 },
      { f: 659.25, t: 0.16, d: 0.22 },
      { f: 659.25, t: 0.32, d: 0.35 },
      { f: 783.99, t: 0.52, d: 0.25 },
      { f: 1046.50, t: 0.70, d: 1.6 },
      { f: 1318.51, t: 0.76, d: 1.8 }
    ];
    notes.forEach((item) => {
      this.playBellNote(ctx, item.f, now + item.t, item.d, 0.22);
    });
  }
}

export const festiveAudio = new FestiveAudioService();

