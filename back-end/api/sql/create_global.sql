CREATE TABLE IF NOT EXISTS "event" (
    "eventKey" VARCHAR(15) NOT NULL,
    "seasonKey" VARCHAR(4) NOT NULL,
    "regionKey" VARCHAR(4) NOT NULL,
    "eventTypeKey" VARCHAR(8) NOT NULL,
    "eventName" VARCHAR(255) NOT NULL,
    "divisionName" VARCHAR(255) NULL,
    "venue" VARCHAR(255),
    "city" VARCHAR(255),
    "stateProv" VARCHAR(255),
    "startDate" VARCHAR(255),
    "endDate" VARCHAR(255),
    "country" VARCHAR(255),
    "website" VARCHAR(255),
    PRIMARY KEY (eventKey),
    UNIQUE (eventKey)
);

CREATE TABLE IF NOT EXISTS "socket_clients" (
    "currentUrl" VARCHAR(255),
    "ipAddress" VARCHAR(64) NOT NULL,
    "fieldNumbers" VARCHAR(255),
    "audienceDisplayChroma" VARCHAR(255),
    "followerMode" INT NOT NULL,
    "followerApiHost" VARCHAR(64),
    "lastSocketId" VARCHAR(64),
    "connected" INT NOT NULL,
    "persistantClientId" VARCHAR(64) NOT NULL,
    PRIMARY KEY (ipAddress, lastSocketId),
    UNIQUE (ipAddress, lastSocketId)
);