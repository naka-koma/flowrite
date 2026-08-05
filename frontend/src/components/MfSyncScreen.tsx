import { useState } from "react";
import { PageHeader } from "./PageHeader";
import { SectionCard } from "./SectionCard";
import { useMfSync } from "../hooks/useMfSync";
import { formatAmount } from "../lib/money";
import type { MfSyncDiffRow } from "../types/api";

interface MfSyncScreenProps {
  hideAmounts: boolean;
  onBack: () => void;
}

// CSVのフィールドにカンマ・ダブルクォート・改行が含まれる場合はダブルクォートで囲む
function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(rows: MfSyncDiffRow[]): string {
  const header = ["日付", "内容", "金額", "金融機関", "大項目", "中項目"];
  const lines = [header, ...rows.map((r) => [r.date, r.content, String(r.amount), r.institution, r.category, r.subcategory])].map(
    (fields) => fields.map((f) => escapeCsvField(f)).join(","),
  );
  // ExcelでUTF-8のCSVを開いた際に文字化けしないようBOMを付与する
  return `﻿${lines.join("\n")}`;
}

function downloadCsv(rows: MfSyncDiffRow[]) {
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const a = document.createElement("a");
  a.href = url;
  a.download = `mf-sync-diff_${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatCheckpoint(checkpoint: string): string {
  if (!checkpoint) return "未記録";
  const date = new Date(checkpoint);
  if (Number.isNaN(date.getTime())) return "未記録";
  return date.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function MfSyncScreen({ hideAmounts, onBack }: MfSyncScreenProps) {
  const { status, rows, checkpoint, errorMessage, completeStatus, completeSync } = useMfSync();
  const [confirmingComplete, setConfirmingComplete] = useState(false);

  const handleCompleteClick = () => {
    if (!confirmingComplete) {
      setConfirmingComplete(true);
      return;
    }
    setConfirmingComplete(false);
    completeSync();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="マネーフォワード書き戻し" onBack={onBack} />

      <SectionCard>
        <p className="text-sm text-base-content/70">
          前回「記録」した時点以降にカテゴリ等が変更された取引を抽出します。マネーフォワードME側の家計簿への実際の反映（画面操作）はこの画面の対象外です。日付・内容・金額・金融機関を手がかりに、該当取引を探して大項目・中項目を書き換えてください。
        </p>
      </SectionCard>

      <SectionCard testId="mf-sync-diff">
        {status === "loading" ? (
          <p className="flex items-center gap-2">
            <span className="loading loading-spinner loading-sm" />
            読み込み中...
          </p>
        ) : status === "error" ? (
          <p role="alert" className="alert alert-error">
            エラー: {errorMessage}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-base-content/70">前回の記録: {formatCheckpoint(checkpoint)}</p>
              <p className="text-sm font-medium">対象: {rows.length}件</p>
            </div>

            {rows.length === 0 ? (
              <p className="text-base-content/70">書き戻し対象の変更はありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>日付</th>
                      <th>内容</th>
                      <th>金額</th>
                      <th>金融機関</th>
                      <th>新・大項目</th>
                      <th>新・中項目</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={`${r.date}-${r.content}-${i}`}>
                        <td>{r.date}</td>
                        <td>{r.content}</td>
                        <td>{hideAmounts ? "***" : formatAmount(r.amount)}</td>
                        <td>{r.institution}</td>
                        <td>{r.category}</td>
                        <td>{r.subcategory}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadCsv(rows)}
                disabled={rows.length === 0}
                className="btn btn-outline btn-sm"
              >
                CSVをダウンロード
              </button>

              {confirmingComplete ? (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-base-content/70">本当に記録しますか？</span>
                  <button type="button" onClick={handleCompleteClick} className="btn btn-error btn-sm">
                    本当に記録する
                  </button>
                  <button type="button" onClick={() => setConfirmingComplete(false)} className="btn btn-sm">
                    キャンセル
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteClick}
                  disabled={rows.length === 0 || completeStatus === "loading"}
                  className="btn btn-primary btn-sm"
                >
                  {completeStatus === "loading" && <span className="loading loading-spinner loading-xs" />}
                  書き戻し完了として記録する
                </button>
              )}
            </div>

            {completeStatus === "success" && <p className="text-sm text-success">記録しました</p>}
            {completeStatus === "error" && (
              <p role="alert" className="alert alert-error">
                エラー: 記録に失敗しました
              </p>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
