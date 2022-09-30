CREATE TABLE IF NOT EXISTS "event" (
    "eventKey" VARCHAR(15) PRIMARY KEY NOT NULL,
    "seasonKey" VARCHAR(4) NOT NULL,
    "regionKey" VARCHAR(4) NOT NULL,
    "eventType" VARCHAR(8) NOT NULL,
    "eventName" VARCHAR(255) NOT NULL,
    "divisionName" VARCHAR(255) NULL,
    "venue" VARCHAR(255),
    "eventTypeKey" VARCHAR(25),
    "city" VARCHAR(255),
    "stateProv" VARCHAR(255),
    "startDate" VARCHAR(255),
    "endDate" VARCHAR(255),
    "country" VARCHAR(255),
    "website" VARCHAR(255),
    "fieldCount" INT
);

CREATE TABLE IF NOT EXISTS "team" (
    "teamKey" INT PRIMARY KEY NOT NULL,
    "eventParticipantKey" VARCHAR(25) NOT NULL,
    "hasCard" INT,
    "teamNameShort" VARCHAR(255),
    "teamNameLong" VARCHAR(255),
    "robotName" VARCHAR(100),
    "city" VARCHAR(255),
    "stateProv" VARCHAR(255),
    "country" VARCHAR(255),
    "countryCode" VARCHAR(2),
    "rookieYear" INT,
    "cardStatus" INT
);

CREATE TABLE IF NOT EXISTS "alliance" (
    "allianceKey" VARCHAR(25) PRIMARY KEY NOT NULL,
    "allianceRank" INT NOT NULL,
    "teamKey" INT NOT NULL,
    "tournamentLevel" INT,
    "allianceNameShort" VARCHAR(5),
    "allianceNameLong" VARCHAR(50),
    "isCaptain" INT,
    FOREIGN KEY (teamKey) REFERENCES "team"(teamKey)
);

CREATE TABLE IF NOT EXISTS "ranking" (
    "rankKey" VARCHAR(40) PRIMARY KEY NOT NULL,
    "teamKey" INT NOT NULL,
    "rank" INT NOT NULL,
    "rankChange" INT,
    "played" INT,
    "wins" INT,
    "losses" INT,
    "ties" INT,
    "allianceKey" VARCHAR(25),
    FOREIGN KEY (teamKey) REFERENCES "team"(teamKey)
);

CREATE TABLE IF NOT EXISTS "schedule" (
    "key" VARCHAR(40) PRIMARY KEY NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(15) NOT NULL,
    "day" INT NOT NULL,
    "startTime" VARCHAR(255) NOT NULL,
    "duration" INT NOT NULL,
    "isMatch" INT NOT NULL,
    "tournamentId" INT
);

CREATE TABLE IF NOT EXISTS "match" (
    "matchKey" VARCHAR(35) PRIMARY KEY NOT NULL,
    "matchDetailKey" VARCHAR(45) NOT NULL,
    "matchName" VARCHAR(50) NOT NULL,
    "tournamentLevel" INT NOT NULL,
    "scheduledTime" VARCHAR(255),
    "startTime" VARCHAR(255),
    "prestartTime" VARCHAR(255),
    "fieldNumber" INT,
    "cycleTime" REAL,
    "redScore" INT,
    "redMinPen" INT,
    "redMajPen" INT,
    "blueScore" INT,
    "blueMinPen" INT,
    "blueMajPen" INT,
    "active" INT,
    "result" INT,
    "uploaded" INT
);

CREATE TABLE IF NOT EXISTS "match_participant" (
    "matchParticipantKey" VARCHAR(45) PRIMARY KEY NOT NULL,
    "matchKey" VARCHAR(35) NOT NULL,
    "teamKey" INT NOT NULL,
    "station" INT NOT NULL,
    "disqualified" INT,
    "cardStatus" INT,
    "surrogate" INT,
    "noShow" INT,
    "allianceKey" VARCHAR(25),
    FOREIGN KEY (matchKey) REFERENCES "match"(matchKey)
);

CREATE TABLE IF NOT EXISTS "match_detail" (
    "matchDetailKey" VARCHAR(45) PRIMARY KEY NOT NULL,
	  "matchKey" VARCHAR(35) NOT NULL,
    FOREIGN KEY (matchKey) REFERENCES "match"(matchKey)
);
