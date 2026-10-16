interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}

type SaveFilePicker = (options: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;

/** Whether this browser can write a file as it is produced (Chromium's File System Access). */
export const canStreamToFile = () => "showSaveFilePicker" in window;

/**
 * Asks where to save `name`, so the file can be written while it is being
 * made instead of held in memory. Null where the browser has no save
 * picker; rejects with an AbortError when the user cancels. Must run
 * straight from a click.
 */
export function chooseSaveFile(
  name: string,
  type: { description: string; mimeType: string },
): Promise<FileSystemFileHandle | null> {
  const picker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (!picker) return Promise.resolve(null);
  const extension = name.slice(name.lastIndexOf("."));
  return picker.call(window, {
    suggestedName: name,
    types: [{ description: type.description, accept: { [type.mimeType]: [extension] } }],
  });
}
