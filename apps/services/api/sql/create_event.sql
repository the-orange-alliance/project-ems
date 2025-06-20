CREATE TABLE IF NOT EXISTS "team" (
    "teamKey" INT NOT NULL,
    "eventKey" VARCHAR(25) NOT NULL,
    "hasCard" INT,
    "teamNumber" VARCHAR(255),
    "teamNameShort" VARCHAR(255),
    "teamNameLong" VARCHAR(255),
    "robotName" VARCHAR(100),
    "city" VARCHAR(255),
    "stateProv" VARCHAR(255),
    "country" VARCHAR(255),
    "countryCode" VARCHAR(2),
    "rookieYear" INT,
    "cardStatus" INT,
    PRIMARY KEY (eventKey, teamKey),
    UNIQUE (eventKey, teamKey)
);

CREATE TABLE IF NOT EXISTS "fms_wpakeys" (
    "teamKey" INT NOT NULL,
    "eventKey" VARCHAR(25) NOT NULL,
    "wpaKey" VARCHAR(25),
    PRIMARY KEY (eventKey, teamKey),
    UNIQUE (eventKey, teamKey)
);

CREATE TABLE IF NOT EXISTS "tournament" (
    "eventKey" VARCHAR(25) NOT NULL,
    "tournamentKey" VARCHAR(25) NOT NULL,
    "tournamentLevel" INT NOT NULL,
    "fieldCount" INT NOT NULL,
    "fields" VARCHAR(255),
    "name" VARCHAR(255),
    PRIMARY KEY (eventKey, tournamentKey),
    UNIQUE (eventKey, tournamentKey)
);

CREATE TABLE IF NOT EXISTS "alliance" (
    "eventKey" VARCHAR(25) NOT NULL,
    "tournamentKey" VARCHAR(25) NOT NULL,
    "teamKey" INT NOT NULL,
    "allianceRank" INT NOT NULL,
    "allianceNameShort" VARCHAR(5),
    "allianceNameLong" VARCHAR(50),
    "isCaptain" INT,
    "pickOrder" INT,
    PRIMARY KEY (eventKey, tournamentKey, teamKey),
    UNIQUE (eventKey, tournamentKey, teamKey),
    FOREIGN KEY (tournamentKey) REFERENCES "tournament"(tournamentKey),
    FOREIGN KEY (teamKey, eventKey) REFERENCES "team"(teamKey, eventKey)
);

CREATE TABLE IF NOT EXISTS "ranking" (
    "eventKey" VARCHAR(25) NOT NULL,
    "tournamentKey" VARCHAR(25) NOT NULL,
    "teamKey" INT NOT NULL,
    "rank" INT NOT NULL,
    "rankChange" INT,
    "played" INT,
    "wins" INT,
    "losses" INT,
    "ties" INT,
    PRIMARY KEY (eventKey, tournamentKey, teamKey),
    UNIQUE (eventKey, tournamentKey, teamKey),
    FOREIGN KEY (tournamentKey) REFERENCES "tournament"(tournamentKey),
    FOREIGN KEY (teamKey) REFERENCES "team"(teamKey)
);

CREATE TABLE IF NOT EXISTS "schedule" (
    "eventKey" VARCHAR(25) NOT NULL,
    "tournamentKey" VARCHAR(25) NOT NULL,
    "id" INT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(15) NOT NULL,
    "day" INT NOT NULL,
    "startTime" VARCHAR(255) NOT NULL,
    "duration" INT NOT NULL,
    "isMatch" INT NOT NULL,
    PRIMARY KEY (eventKey, tournamentKey, id),
    UNIQUE (eventKey, tournamentKey, id),
    FOREIGN KEY (tournamentKey) REFERENCES "tournament"(tournamentKey)
);

CREATE TABLE IF NOT EXISTS "schedule_params" (
    "eventKey" VARCHAR(25) NOT NULL,
    "tournamentKey" VARCHAR(25) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "days" TEXT NOT NULL,
    "matchConcurrency" REAL NOT NULL,
    "teamKeys" TEXT NOT NULL,
    "matchesPerTeam" REAL NOT NULL,
    "cycleTime" REAL NOT NULL,
    "hasPremiereField" INT NOT NULL,
    "options" TEXT NOT NULL,
    PRIMARY KEY (eventKey, tournamentKey),
    UNIQUE (eventKey, tournamentKey)
);

CREATE TABLE IF NOT EXISTS "match" (
    "eventKey" VARCHAR(25) NOT NULL,
    "tournamentKey" VARCHAR(25) NOT NULL,
    "id" INT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
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
    "uploaded" INT,
    PRIMARY KEY (eventKey, tournamentKey, id),
    UNIQUE (eventKey, tournamentKey, id),
    FOREIGN KEY (tournamentKey) REFERENCES "tournament"(tournamentKey)
);

CREATE TABLE IF NOT EXISTS "match_participant" (
    "eventKey" VARCHAR(25) NOT NULL,
    "tournamentKey" VARCHAR(25) NOT NULL,
    "id" INT NOT NULL,
    "station" INT NOT NULL,
    "teamKey" INT NOT NULL,
    "disqualified" INT,
    "cardStatus" INT,
    "surrogate" INT,
    "noShow" INT,
    PRIMARY KEY (eventKey, tournamentKey, id, station),
    UNIQUE (eventKey, tournamentKey, id, station),
    FOREIGN KEY (tournamentKey) REFERENCES "tournament"(tournamentKey),
    FOREIGN KEY (id) REFERENCES "match"(id),
    FOREIGN KEY (teamKey) REFERENCES "team"(teamKey)
);

CREATE TABLE IF NOT EXISTS "match_detail" (
    "eventKey" VARCHAR(25) NOT NULL,
    "tournamentKey" VARCHAR(25) NOT NULL,
    "id" INT NOT NULL,
    PRIMARY KEY (eventKey, tournamentKey, id),
    UNIQUE (eventKey, tournamentKey, id),
    FOREIGN KEY (tournamentKey) REFERENCES "tournament"(tournamentKey),
    FOREIGN KEY (id) REFERENCES "match"(id)
);
