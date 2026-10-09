import { execSync } from "node:child_process";

const apiUrl =
  "https://project-ems-backend-api.y690brx6b6bgr.us-east-1.cs.amazonlightsail.com";
const rltUrl =
  "wss://project-ems-backend-rlt.y690brx6b6bgr.us-east-1.cs.amazonlightsail.com";

const run = (command) => {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: "inherit" });
  execSync("where.exe lightsailctl", {
    stdio: "inherit",
  });
};

const service = "project-ems";
const profile = "default";
const region = "us-east-1";

run("docker build --target backend-api -t ems-backend-api:dev .");
run("docker build --target backend-rlt -t ems-backend-rlt:dev .");

run(
  `docker build --target web --build-arg VITE_API_URL="${apiUrl}" --build-arg VITE_RLT_URL="${rltUrl}" -t ems-web:dev .`,
);

run(
  `aws lightsail push-container-image --profile ${profile} --region ${region} --service-name ${service}-backend-api --label backend-api-dev --image ems-backend-api:dev`,
);

run(
  `aws lightsail push-container-image --profile ${profile} --region ${region} --service-name ${service}-backend-rlt --label backend-rlt-dev --image ems-backend-rlt:dev`,
);

run(
  `aws lightsail push-container-image --profile ${profile} --region ${region} --service-name ${service}-web --label web-dev --image ems-web:dev`,
);
