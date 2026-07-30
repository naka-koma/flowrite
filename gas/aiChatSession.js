// AIアドバイスの対話を永続化する。複数保持はせず、常に直近1件だけを
// 上書き保存する（詳細はIssue #195の設計方針を参照）。
// これによりAIページを開いた瞬間に自動で続きが再開でき、
// 一覧から選ぶUIを新設する必要がない。

const AI_CHAT_SESSION_COLUMN_COUNT = 7;

function handleGetAiChatSession() {
  const sheet = getAiChatSessionSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { session: null };
  }

  const row = sheet.getRange(2, 1, 1, AI_CHAT_SESSION_COLUMN_COUNT).getValues()[0];
  if (!row[0]) {
    return { session: null };
  }

  try {
    return {
      session: {
        updatedAt: row[0],
        messages: JSON.parse(row[1] || "[]"),
        history: JSON.parse(row[2] || "[]"),
        quickReplies: JSON.parse(row[3] || "[]"),
        isFinal: !!row[4],
        todoActions: JSON.parse(row[5] || "[]"),
        categorySuggestions: JSON.parse(row[6] || "[]"),
      },
    };
  } catch (e) {
    // 壊れたデータを読み込めないままにするより、新しく対話を始められる方がよい
    Logger.log(`handleGetAiChatSession parse error: ${e.message}`);
    return { session: null };
  }
}

// 常に1行を上書きする（upsert）。呼び出し元はターンの成功時にfire-and-forgetで
// 呼ぶ想定のため、セル文字数上限を超えた場合などはエラーを返すのみで例外は投げない
function handleSaveAiChatSession(body) {
  try {
    const session = (body && body.session) || {};
    const sheet = getAiChatSessionSheet();
    const lastRow = sheet.getLastRow();

    const row = [
      new Date().toISOString(),
      JSON.stringify(session.messages || []),
      JSON.stringify(session.history || []),
      JSON.stringify(session.quickReplies || []),
      !!session.isFinal,
      JSON.stringify(session.todoActions || []),
      JSON.stringify(session.categorySuggestions || []),
    ];

    if (lastRow > 1) {
      sheet.getRange(2, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    return { success: true };
  } catch (e) {
    Logger.log(`handleSaveAiChatSession error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

function handleClearAiChatSession() {
  const sheet = getAiChatSessionSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRow(2);
  }
  return { success: true };
}
