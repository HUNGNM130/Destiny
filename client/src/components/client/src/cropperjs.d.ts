declare module 'cropperjs' {
  export default class Cropper {
    constructor(element: HTMLElement, options?: Record<string, unknown>);
    destroy(): void;
    rotateTo(degree: number): void;
    getCroppedCanvas(options?: Record<string, unknown>): HTMLCanvasElement;
  }
}
