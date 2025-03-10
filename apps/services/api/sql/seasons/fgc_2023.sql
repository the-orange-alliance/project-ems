ALTER TABLE "ranking" ADD COLUMN rankingScore INT;
ALTER TABLE "ranking" ADD COLUMN highestScore INT;
ALTER TABLE "ranking" ADD COLUMN oxyHydroPoints INT;

ALTER TABLE "match_detail" ADD COLUMN redHydrogenPoints;
ALTER TABLE "match_detail" ADD COLUMN redOxygenPoints;
ALTER TABLE "match_detail" ADD COLUMN redAlignment;
ALTER TABLE "match_detail" ADD COLUMN redOneProficiency;
ALTER TABLE "match_detail" ADD COLUMN redTwoProficiency;
ALTER TABLE "match_detail" ADD COLUMN redThreeProficiency;

ALTER TABLE "match_detail" ADD COLUMN blueHydrogenPoints;
ALTER TABLE "match_detail" ADD COLUMN blueOxygenPoints;
ALTER TABLE "match_detail" ADD COLUMN blueAlignment;
ALTER TABLE "match_detail" ADD COLUMN blueOneProficiency;
ALTER TABLE "match_detail" ADD COLUMN blueTwoProficiency;
ALTER TABLE "match_detail" ADD COLUMN blueThreeProficiency;

ALTER TABLE "match_detail" ADD COLUMN coopertitionBonus;
