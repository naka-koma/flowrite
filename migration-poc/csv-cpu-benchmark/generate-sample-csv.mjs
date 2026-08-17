// MoneyForwardのCSVフォーマット（docs/csv-format.md参照）に沿った、実データ規模相当の
// ダミーCSVを生成する。実行: node migration-poc/csv-cpu-benchmark/generate-sample-csv.mjs <行数>
import { writeFileSync } from "node:fs";

const rowCount = Number(process.argv[2]) || 5000;

const institutions = ["楽天カード", "住信SBIネット銀行", "三井住友カード", "PayPay銀行"];
const categories = [
  ["食費", "スーパー"],
  ["食費", "外食"],
  ["交通費", "電車"],
  ["娯楽", "書籍"],
  ["水道光熱費", "電気"],
];

const header = "計算対象,日付,内容,金額,保有金融機関,大項目,中項目,メモ,振替,ID\n";
const lines = [header];

const start = new Date(2020, 0, 1);
for (let i = 0; i < rowCount; i++) {
  const date = new Date(start.getTime() + i * 6 * 60 * 60 * 1000); // 6時間おき
  const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
  const [category, subcategory] = categories[i % categories.length];
  const institution = institutions[i % institutions.length];
  const amount = -(1000 + (i % 50) * 137);
  lines.push(`1,${dateStr},店舗${i},${amount},${institution},${category},${subcategory},,0,mf-id-${i}\n`);
}

const outPath = new URL("./sample.csv", import.meta.url);
writeFileSync(outPath, lines.join(""), "utf-8");
console.log(`Generated ${rowCount} rows -> ${outPath.pathname}`);
