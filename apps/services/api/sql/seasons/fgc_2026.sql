ALTER TABLE "ranking" ADD COLUMN rankingScore INT;
ALTER TABLE "ranking" ADD COLUMN highestScore INT;
ALTER TABLE "ranking" ADD COLUMN climbPoints INT;


ALTER TABLE "match_detail" ADD COLUMN wildfireInRedSuppressionUnit INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN wildfireInBlueSuppressionUnit INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN wildfireInExtinguisher INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN redRobotOneBraceState REAL NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN redRobotTwoBraceState REAL NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN redRobotThreeBraceState REAL NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN blueRobotOneBraceState REAL NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN blueRobotTwoBraceState REAL NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN blueRobotThreeBraceState REAL NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN redRobotOnePartnerClimb INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN redRobotTwoPartnerClimb INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN redRobotThreePartnerClimb INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN blueRobotOnePartnerClimb INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN blueRobotTwoPartnerClimb INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN blueRobotThreePartnerClimb INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN coopertition INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN redClimbMultiplier REAL NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN blueClimbMultiplier REAL NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN redPartnerClimbPoints INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN bluePartnerClimbPoints INT NOT NULL DEFAULT 0;
