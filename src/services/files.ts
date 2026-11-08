import * as Picker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
const MAX = 25_000_000;
export async function readLocal(uri: string) {
  if (!/^(file|content):\/\//.test(uri)) throw new Error('Only local files can be imported.');
  const f = new File(uri);
  if (f.size > MAX) throw new Error('File is too large (maximum 25 MB).');
  const text = await f.text();
  if (text.length > MAX) throw new Error('File is too large.');
  return text.replace(/^\uFEFF/, '');
}
export async function pickText() {
  const r = await Picker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (r.canceled) return null;
  try {
    return await readLocal(r.assets[0].uri);
  } finally {
    const f = new File(r.assets[0].uri);
    if (f.uri.startsWith(Paths.cache.uri) && f.exists) f.delete();
  }
}
export async function exportJSON(kind: string, data: unknown) {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('File sharing is unavailable on this device.');
  const file = new File(Paths.cache, `verdant-${kind}-${Date.now()}.json`);
  file.write(JSON.stringify(data, null, 2));
  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: `Export ${kind}`,
      UTI: 'public.json',
    });
  } finally {
    if (file.exists) file.delete();
  }
}
export function clearExportCache() {
  for (const f of Paths.cache.list())
    if (f instanceof File && f.name.startsWith('verdant-') && f.name.endsWith('.json')) f.delete();
}
