ALTER TABLE "ranking" ADD COLUMN rankingScore INT;
ALTER TABLE "ranking" ADD COLUMN carbonPoints INT;

ALTER TABLE "match_detail" ADD COLUMN carbonPoints INT;
ALTER TABLE "match_detail" ADD COLUMN redRobotOneStorage INT;
ALTER TABLE "match_detail" ADD COLUMN redRobotTwoStorage INT;
ALTER TABLE "match_detail" ADD COLUMN redRobotThreeStorage INT;
ALTER TABLE "match_detail" ADD COLUMN blueRobotOneStorage INT;
ALTER TABLE "match_detail" ADD COLUMN blueRobotTwoStorage INT;
ALTER TABLE "match_detail" ADD COLUMN blueRobotThreeStorage INT;
ALTER TABLE "match_detail" ADD COLUMN coopertitionBonusLevel INT;
