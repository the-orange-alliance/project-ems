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

CREATE TABLE IF NOT EXISTS "fms_adv_net_cfg" (
    "eventKey" VARCHAR(25),
    "hwFingerprint" VARCHAR(255) NOT NULL,
    "fieldNumber" INT NOT NULL,
    "enableFms" INT NOT NULL,
    "enableAdvNet" INT NOT NULL,
    "apIp" VARCHAR(255) NOT NULL,
    "apUsername" VARCHAR(255) NOT NULL,
    "apPassword" VARCHAR(255) NOT NULL,
    "apTeamCh" VARCHAR(255) NOT NULL,
    "apAdminCh" VARCHAR(255) NOT NULL,
    "apAdminSsid" VARCHAR(255) NOT NULL,
    "apAdminWpa" VARCHAR(255) NOT NULL,
    "switchIp" VARCHAR(255) NOT NULL,
    "switchUsername" VARCHAR(255) NOT NULL,
    "switchPassword" VARCHAR(255) NOT NULL,
    "enablePlc" INT NOT NULL,
    "plcIp" VARCHAR(255) NOT NULL,
    "registeredAt" VARCHAR(255) NOT NULL,
    PRIMARY KEY (hwFingerprint)
);

CREATE TABLE IF NOT EXISTS "fcs_settings" (
  "field" TEXT PRIMARY KEY,
  "data" TEXT NOT NULL
);