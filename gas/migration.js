const MIGRATION_APPLIED_PROPERTY_KEY = "APPLIED_MIGRATIONS";

// マイグレーションは配列の順に実行される。IDは一度使ったら変更・再利用しない。
const MIGRATIONS = [
  {
    id: "001_normalize_raw_data_amount",
    description: "raw_dataのamount列に残っている文字列（クォート・カンマ付き）を数値に正規化する",
    run: function () {
      const sheet = getRawDataSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return { updated: 0 };
      }

      const range = sheet.getRange(2, 4, lastRow - 1, 1); // D列 = amount
      const values = range.getValues();
      let updated = 0;

      const normalized = values.map(function (row) {
        const amount = row[0];
        if (typeof amount !== "string") {
          return [amount];
        }
        const cleaned = amount.replace(/[",]/g, "").trim();
        const num = Number(cleaned);
        if (cleaned === "" || isNaN(num)) {
          return [amount];
        }
        updated++;
        return [num];
      });

      range.setValues(normalized);
      return { updated: updated };
    },
  },
  {
    id: "002_add_updated_at",
    description: "raw_dataにupdatedAt列（L列）を追加し、既存行はimportedAtの値で初期化する",
    run: function () {
      const sheet = getRawDataSheet();
      const lastRow = sheet.getLastRow();

      const headerRange = sheet.getRange(1, 12, 1, 1);
      if (headerRange.getValue() !== "updatedAt") {
        headerRange.setValue("updatedAt");
      }

      if (lastRow <= 1) {
        return { updated: 0 };
      }

      const importedAt = sheet.getRange(2, 11, lastRow - 1, 1).getValues();
      sheet.getRange(2, 12, lastRow - 1, 1).setValues(importedAt);
      return { updated: lastRow - 1 };
    },
  },
  {
    id: "003_add_ai_attributes_id",
    description: "ai_attributesシートにid列を追加し、列順をid, key, valueに揃える（既存行にはUUIDを割り当てる）",
    run: function () {
      const sheet = getAiAttributesSheet();
      const lastRow = sheet.getLastRow();

      const header = sheet.getRange(1, 1, 1, 3).getValues()[0];
      if (header[0] === "id" && header[1] === "key" && header[2] === "value") {
        return { updated: 0 };
      }

      if (lastRow <= 1) {
        sheet.getRange(1, 1, 1, 3).setValues([["id", "key", "value"]]);
        return { updated: 0 };
      }

      // 既存は key(A), value(B) の並びのため、id を先頭に挿入した新しい並びで書き直す
      const existing = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      const rows = existing.map(function (row) {
        return [Utilities.getUuid(), row[0], row[1]];
      });

      sheet.getRange(1, 1, 1, 3).setValues([["id", "key", "value"]]);
      sheet.getRange(2, 1, rows.length, 3).setValues(rows);
      return { updated: rows.length };
    },
  },
  {
    id: "004_backfill_categories_from_raw_data",
    description: "raw_dataシートの全行から(大項目, 中項目)ペアを抽出し、categoriesシートに未登録分を追加する",
    run: function () {
      const rawDataSheet = getRawDataSheet();
      const lastRow = rawDataSheet.getLastRow();
      if (lastRow <= 1) {
        return { updated: 0 };
      }

      const rows = rawDataSheet.getRange(2, 6, lastRow - 1, 2).getValues(); // F:category, G:subcategory
      const categoriesSheet = getCategoriesSheet();
      const existingPairs = getExistingCategoryPairs(categoriesSheet);
      const seen = new Set();
      const newPairs = [];

      for (const [category, subcategory] of rows) {
        if (!category || !subcategory) continue;
        const key = `${category} ${subcategory}`;
        if (existingPairs.has(key) || seen.has(key)) continue;
        seen.add(key);
        newPairs.push({ category, subcategory });
      }

      appendCategoryPairs(categoriesSheet, newPairs);
      return { updated: newPairs.length };
    },
  },
  {
    id: "005_add_category_locked",
    description: "raw_dataにcategoryLocked列（M列）を追加し、既存行はFALSEで初期化する",
    run: function () {
      const sheet = getRawDataSheet();
      const lastRow = sheet.getLastRow();

      const headerRange = sheet.getRange(1, 13, 1, 1);
      if (headerRange.getValue() !== "categoryLocked") {
        headerRange.setValue("categoryLocked");
      }

      if (lastRow <= 1) {
        return { updated: 0 };
      }

      const range = sheet.getRange(2, 13, lastRow - 1, 1);
      const existing = range.getValues();
      // 未設定(空文字)の行のみFALSEで埋める。再実行時に既存のロック状態を壊さない
      const filled = existing.map(function (row) {
        return [row[0] === "" ? false : row[0]];
      });
      range.setValues(filled);
      return { updated: lastRow - 1 };
    },
  },
];

function getAppliedMigrationIds_() {
  const raw = PropertiesService.getScriptProperties().getProperty(MIGRATION_APPLIED_PROPERTY_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveAppliedMigrationIds_(ids) {
  PropertiesService.getScriptProperties().setProperty(MIGRATION_APPLIED_PROPERTY_KEY, JSON.stringify(ids));
}

// 未適用のマイグレーションを順に実行する。1件でも失敗したら後続は実行しない。
// 成功したものだけ適用済みとして記録するため、失敗したマイグレーションは次回再実行される。
function runPendingMigrations() {
  const appliedIds = getAppliedMigrationIds_();
  const appliedSet = {};
  appliedIds.forEach(function (id) {
    appliedSet[id] = true;
  });

  const results = [];
  const newlyApplied = [];

  for (const migration of MIGRATIONS) {
    if (appliedSet[migration.id]) continue;

    try {
      const result = migration.run();
      results.push({ id: migration.id, description: migration.description, success: true, result: result });
      newlyApplied.push(migration.id);
    } catch (e) {
      results.push({ id: migration.id, description: migration.description, success: false, error: e.message });
      break;
    }
  }

  if (newlyApplied.length > 0) {
    saveAppliedMigrationIds_(appliedIds.concat(newlyApplied));
  }

  return { results: results, appliedCount: newlyApplied.length };
}

function handleRunMigrations() {
  return runPendingMigrations();
}

// スプレッドシートを開いたときに「flowrite管理」メニューを追加する
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("flowrite管理")
    .addItem("マイグレーション実行", "runMigrationsFromMenu")
    .addToUi();
}

function runMigrationsFromMenu() {
  const ui = SpreadsheetApp.getUi();
  const confirmed = ui.alert(
    "マイグレーション実行",
    "未適用のマイグレーションを実行します。よろしいですか？",
    ui.ButtonSet.YES_NO,
  );
  if (confirmed !== ui.Button.YES) {
    return;
  }

  const result = runPendingMigrations();

  if (result.results.length === 0) {
    ui.alert("マイグレーション実行結果", "適用対象のマイグレーションはありませんでした。", ui.ButtonSet.OK);
    return;
  }

  const lines = result.results.map(function (r) {
    const mark = r.success ? "✓" : "✗";
    const detail = r.success ? "" : `（エラー: ${r.error}）`;
    return `${mark} ${r.id}: ${r.description}${detail}`;
  });
  ui.alert("マイグレーション実行結果", lines.join("\n"), ui.ButtonSet.OK);
}
