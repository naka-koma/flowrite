-- handleSummary(unit=month) の「カテゴリ別支出内訳」相当
SELECT category AS name, SUM(-amount) AS total
FROM raw_data
WHERE is_target = 1 AND is_transfer = 0 AND amount < 0
  AND date >= '2022-06-01' AND date < '2022-07-01'
GROUP BY category
ORDER BY total DESC;
