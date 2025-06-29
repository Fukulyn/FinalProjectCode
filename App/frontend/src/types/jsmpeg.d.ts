declare module 'jsmpeg' {
  export class Player {
    constructor(
      source: WebSocket | string,
      options?: {
        canvas?: HTMLCanvasElement;
        autoplay?: boolean;
        audio?: boolean;
        loop?: boolean;
        onPlay?: () => void;
        onPause?: () => void;
        onStalled?: () => void;
        onError?: () => void;
      }
    );
    play(): void;
    pause(): void;
    stop(): void;
    destroy(): void;
    volume: number;
    levels: {
      current: number;
      peak: number;
    };
  }
} 