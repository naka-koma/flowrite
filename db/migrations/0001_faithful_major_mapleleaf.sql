CREATE INDEX "raw_data_date_idx" ON "raw_data" USING btree ("date");--> statement-breakpoint
CREATE INDEX "raw_data_category_idx" ON "raw_data" USING btree ("category");