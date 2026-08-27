import { execSync } from "node:child_process";

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

run("docker build --target backend -t ems-backend:dev .");
run("docker build --target web -t ems-web:dev .");

run(
  `aws lightsail push-container-image --profile ${profile} --region ${region} --service-name ${service}-backend --label backend-dev --image ems-backend:dev`,
);

run(
  `aws lightsail push-container-image --profile ${profile} --region ${region} --service-name ${service}-web --label web-dev --image ems-web:dev`,
);
