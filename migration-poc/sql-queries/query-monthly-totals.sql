-- handleSummary(unit=month) の「totalExpense/totalIncome」相当
SELECT
  SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS totalExpense,
  SUM(CASE WHEN amount >= 0 THEN amount ELSE 0 END) AS totalIncome
FROM raw_data
WHERE is_target = 1 AND is_transfer = 0
  AND date >= '2022-06-01' AND date < '2022-07-01';
