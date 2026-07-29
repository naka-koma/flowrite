// ファイル選択・フォルダ選択・ドラッグ&ドロップのいずれで受け取っても、
// 最終的に「CSVファイルのFile配列」に揃えるためのヘルパー

function isCsv(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv");
}

// 同じファイルを2度渡された場合に重複させない。フォルダとファイルを続けて
// 選んだときに同一ファイルが混ざりうるため、名前とサイズで判定する
function dedupe(files: File[]): File[] {
  const seen = new Set<string>();
  const result: File[] = [];
  for (const file of files) {
    const key = `${file.name}:${file.size}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(file);
  }
  return result;
}

export function toCsvFiles(files: File[]): File[] {
  return dedupe(files.filter(isCsv)).sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

function entryToFile(entry: FileSystemFileEntry): Promise<File | null> {
  return new Promise((resolve) => {
    entry.file(
      (file) => resolve(file),
      () => resolve(null),
    );
  });
}

// readEntriesは一度の呼び出しで最大100件しか返さないため、空配列が返るまで繰り返す
function readAllEntries(entry: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  return new Promise((resolve) => {
    const reader = entry.createReader();
    const collected: FileSystemEntry[] = [];

    const readBatch = () => {
      reader.readEntries(
        (entries) => {
          if (entries.length === 0) {
            resolve(collected);
            return;
          }
          collected.push(...entries);
          readBatch();
        },
        () => resolve(collected),
      );
    };
    readBatch();
  });
}

async function collectFromEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    const file = await entryToFile(entry as FileSystemFileEntry);
    return file ? [file] : [];
  }

  if (entry.isDirectory) {
    const entries = await readAllEntries(entry as FileSystemDirectoryEntry);
    const nested = await Promise.all(entries.map(collectFromEntry));
    return nested.flat();
  }

  return [];
}

// ドロップされたものがフォルダの場合もあるため、entry APIが使える場合は
// 再帰的に走査する。使えない場合はDataTransfer.filesにフォールバックする
export async function collectDroppedCsvFiles(dataTransfer: DataTransfer): Promise<File[]> {
  const items = Array.from(dataTransfer.items ?? []);
  const entries = items
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => !!entry);

  if (entries.length === 0) {
    return toCsvFiles(Array.from(dataTransfer.files ?? []));
  }

  const collected = await Promise.all(entries.map(collectFromEntry));
  return toCsvFiles(collected.flat());
}
