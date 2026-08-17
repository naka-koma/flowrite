// workerd（Cloudflare Workersのローカル実行ランタイム）上でShift-JISデコードが
// できるかを確認するだけの使い捨てWorker。
// 実行: npx wrangler dev migration-poc/shift-jis-check/worker.mjs --port 8790
// その後 curl http://localhost:8790 で結果を確認する

export default {
  async fetch() {
    // MoneyForwardのCSV想定: 計算対象,日付,内容,金額,保有金融機関,大項目,中項目,メモ,振替,ID
    // 「振込手数料」をShift-JISでエンコードしたバイト列
    const shiftJisBytes = new Uint8Array([
      0x90, 0x55, 0x8d, 0x9e, 0x8e, 0xe8, 0x90, 0x94, 0x97, 0xbf,
    ]);

    try {
      const decoder = new TextDecoder("shift_jis");
      const decoded = decoder.decode(shiftJisBytes);
      const expected = "振込手数料";
      return Response.json({
        success: true,
        decoded,
        matchesExpected: decoded === expected,
      });
    } catch (e) {
      return Response.json({ success: false, error: e.message }, { status: 500 });
    }
  },
};
