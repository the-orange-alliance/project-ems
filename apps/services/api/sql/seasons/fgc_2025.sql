ALTER TABLE "ranking" ADD COLUMN rankingScore INT;
ALTER TABLE "ranking" ADD COLUMN highestScore INT;
ALTER TABLE "ranking" ADD COLUMN protectionPoints INT;


ALTER TABLE "match_detail" ADD COLUMN barriersInRedMitigator INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN barriersInBlueMitigator INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN biodiversityUnitsRedSideEcosystem INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN biodiversityUnitsCenterEcosystem INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN biodiversityUnitsBlueSideEcosystem INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN biodiversityDistributionFactor INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN approximateBiodiversityRedSideEcosystem INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN approximateBiodiversityCenterEcosystem INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN approximateBiodiversityBlueSideEcosystem INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN redRobotOneParking INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN redRobotTwoParking INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN redRobotThreeParking INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN blueRobotOneParking INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN blueRobotTwoParking INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN blueRobotThreeParking INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN coopertition INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN biodiversityDistributed INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN redProtectionMultiplier REAL NOT NULL DEFAULT 1;
ALTER TABLE "match_detail" ADD COLUMN blueProtectionMultiplier REAL NOT NULL DEFAULT 1;
ALTER TABLE "match_detail" ADD COLUMN redTotalProtectionPoints INT NOT NULL DEFAULT 0;
ALTER TABLE "match_detail" ADD COLUMN allBarriersCleared INT NOT NULL DEFAULT 0;
