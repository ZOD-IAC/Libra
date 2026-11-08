let text: string | null = null;
export function receiveSharedText(value: string) {
  text = value;
}
export function consumeSharedText() {
  const value = text;
  text = null;
  return value;
}
