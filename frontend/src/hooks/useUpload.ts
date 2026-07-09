import { useState } from "react";
import type { UploadResponse } from "../types/api";

type UploadStatus = "idle" | "loading" | "success" | "error";

interface UploadState {
  status: UploadStatus;
  result: UploadResponse | null;
  errorMessage: string | null;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // "data:<mime>;base64,<data>" の先頭部分を取り除く
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    status: "idle",
    result: null,
    errorMessage: null,
  });

  const upload = async (file: File) => {
    setState({ status: "loading", result: null, errorMessage: null });

    try {
      const csv = await readAsBase64(file);
      const response = await fetch("?action=upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data: UploadResponse = await response.json();

      if (!data.success) {
        setState({
          status: "error",
          result: null,
          errorMessage: data.error ?? "アップロードに失敗しました",
        });
        return;
      }

      setState({ status: "success", result: data, errorMessage: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "アップロードに失敗しました";
      setState({ status: "error", result: null, errorMessage: message });
    }
  };

  return { ...state, upload };
}
