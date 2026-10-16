type OpenFilePicker = (options: { multiple: boolean }) => Promise<FileSystemFileHandle[]>;
type HandleItem = DataTransferItem & {
  getAsFileSystemHandle(): Promise<FileSystemHandle | null>;
};

/**
 * Picked and dropped files that came with a handle. Linking a file through
 * its handle instead of copying it into IndexedDB makes importing instant
 * and free of quota, however large the file.
 */
const handles = new WeakMap<Blob, FileSystemFileHandle>();

export const handleOf = (file: Blob): FileSystemFileHandle | null => handles.get(file) ?? null;

async function fromHandles(list: readonly FileSystemFileHandle[]): Promise<File[]> {
  const files = await Promise.all(list.map((handle) => handle.getFile()));
  files.forEach((file, i) => handles.set(file, list[i]!));
  return files;
}

/**
 * Lets the user pick files. Where the browser has `showOpenFilePicker`
 * the files come linked to their handles; elsewhere `fallback` (a file
 * input whose change handler takes over) is opened and this resolves null.
 * Must run straight from a click or key press.
 */
export async function pickFiles(fallback: HTMLInputElement | null): Promise<File[] | null> {
  const picker = (window as Window & { showOpenFilePicker?: OpenFilePicker }).showOpenFilePicker;
  if (!picker) {
    fallback?.click();
    return null;
  }
  return fromHandles(await picker.call(window, { multiple: true }));
}

/**
 * The files of a drop, linked to their handles where the browser offers
 * them. Must be called during the drop event: its data is gone afterwards.
 */
export function droppedFiles(data: DataTransfer): Promise<File[]> {
  const files = [...data.files];
  const items = [...data.items].filter((item) => item.kind === "file");
  if (items.length !== files.length || !items.every((item) => "getAsFileSystemHandle" in item)) {
    return Promise.resolve(files);
  }
  const pending = items.map((item) => (item as HandleItem).getAsFileSystemHandle());
  return Promise.all(pending)
    .then((list) =>
      list.every((h): h is FileSystemFileHandle => h?.kind === "file") ? fromHandles(list) : files,
    )
    .catch(() => files);
}
