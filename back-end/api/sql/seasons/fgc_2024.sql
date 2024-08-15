ALTER TABLE "ranking" ADD COLUMN rankingScore INT;
ALTER TABLE "ranking" ADD COLUMN highestScore INT;
ALTER TABLE "ranking" ADD COLUMN foodSecuredPoints INT;

ALTER TABLE "match_detail" ADD COLUMN redResevoirConserved;
ALTER TABLE "match_detail" ADD COLUMN redNexusConserved;
ALTER TABLE "match_detail" ADD COLUMN redFoodProduced;
ALTER TABLE "match_detail" ADD COLUMN redFoodSecured;
ALTER TABLE "match_detail" ADD COLUMN redRobotOneBalanced;
ALTER TABLE "match_detail" ADD COLUMN redRobotTwoBalanced;
ALTER TABLE "match_detail" ADD COLUMN redRobotThreeBalanced;

ALTER TABLE "match_detail" ADD COLUMN blueResevoirConserved;
ALTER TABLE "match_detail" ADD COLUMN blueNexusConserved;
ALTER TABLE "match_detail" ADD COLUMN blueFoodProduced;
ALTER TABLE "match_detail" ADD COLUMN blueFoodSecured;
ALTER TABLE "match_detail" ADD COLUMN blueRobotOneBalanced;
ALTER TABLE "match_detail" ADD COLUMN blueRobotTwoBalanced;
ALTER TABLE "match_detail" ADD COLUMN blueRobotThreeBalanced;

ALTER TABLE "match_detail" ADD COLUMN coopertition;
