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
