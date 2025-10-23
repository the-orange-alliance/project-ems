import * as cdk from "aws-cdk-lib";
import { aws_ecr as ecr, aws_iam as iam } from "aws-cdk-lib";
import { Construct } from "constructs";

export class EcrCicdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const org = "the-orange-alliance";
    const repo = "project-ems";
    const branch = "main";

    const backendRepo = new ecr.Repository(this, "BackendEcrRepo", {
      repositoryName: "ems-backend",
      removalPolicy: cdk.RemovalPolicy.RETAIN, // keep on stack deletion
    });

    const webRepo = new ecr.Repository(this, "WebEcrRepo", {
      repositoryName: "ems-web",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new iam.OpenIdConnectProvider(this, "GitHubOIDCProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
      thumbprints: ["6938fd4d98bab03faadb97b34396831e3780aea1"],
    });

    const oidcProviderArn = `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`;
    const githubOidcProvider =
      iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
        this,
        "GitHubOidcProvider",
        oidcProviderArn,
      );

    const githubActionsPrincipal = new iam.WebIdentityPrincipal(
      githubOidcProvider.openIdConnectProviderArn,
      {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": `repo:${org}/${repo}:ref:refs/heads/${branch}`,
        },
      },
    );

    const githubActionsRole = new iam.Role(this, "GitHubActionsEcrPushRole", {
      roleName: "GitHubActionsECRPush",
      assumedBy: githubActionsPrincipal,
      description: "Allows GitHub Actions to push Docker images to ECR",
    });

    [backendRepo, webRepo].forEach((repo) => {
      repo.grantPullPush(githubActionsRole);
    });

    // Also need permission to get the authorization token
    githubActionsRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"],
      }),
    );

    new cdk.CfnOutput(this, "BackendEcrUri", {
      value: backendRepo.repositoryUri,
    });

    new cdk.CfnOutput(this, "WebEcrUri", {
      value: webRepo.repositoryUri,
    });

    new cdk.CfnOutput(this, "GitHubActionsRoleArn", {
      value: githubActionsRole.roleArn,
    });
  }
}
