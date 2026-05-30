export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function isFinePointerDevice(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}
