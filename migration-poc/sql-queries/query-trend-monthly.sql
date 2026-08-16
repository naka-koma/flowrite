-- handleTrend(unit=month) の全期間推移相当
SELECT
  substr(date, 1, 7) AS ym,
  SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS totalExpense,
  SUM(CASE WHEN amount >= 0 THEN amount ELSE 0 END) AS totalIncome
FROM raw_data
WHERE is_target = 1 AND is_transfer = 0
GROUP BY ym
ORDER BY ym
LIMIT 6;
