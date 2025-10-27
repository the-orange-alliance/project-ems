import * as cdk from "aws-cdk-lib";
import { aws_iam as iam, aws_ecr as ecr, aws_s3 as s3 } from "aws-cdk-lib";
import { Construct } from "constructs";

export class PublicEcrCicdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const org = "the-orange-alliance";
    const repo = "project-ems";
    const branch = "main";

    // -------------------------------
    // Create Public ECR Repositories
    // -------------------------------
    const backendRepo = new ecr.CfnPublicRepository(this, "BackendPublicRepo", {
      repositoryName: "ems-backend",
    });

    const webRepo = new ecr.CfnPublicRepository(this, "WebPublicRepo", {
      repositoryName: "ems-web",
    });

    // -------------------------------
    // Create bucket for backing up database snapshots
    //--------------------------------
    const bucket = new s3.Bucket(this, "BackupBucket", {
      bucketName: "ems-backups-" + this.account + "-" + this.region,
      versioned: true,
    });

    // GitHub OIDC provider
    const githubOidcProviderArn = `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`;

    const githubOidcProvider =
      iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
        this,
        "GitHubOidcProvider",
        githubOidcProviderArn,
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

    // GitHub Actions role
    const githubActionsRole = new iam.Role(this, "GitHubActionsEcrPushRole", {
      roleName: "GitHubActionsPublicECRPush",
      assumedBy: githubActionsPrincipal,
      description: "Allows GitHub Actions to push Docker images to public ECR",
    });

    githubActionsRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "sts:GetServiceBearerToken",
          "ecr-public:GetAuthorizationToken",
          "ecr-public:InitiateLayerUpload",
          "ecr-public:UploadLayerPart",
          "ecr-public:CompleteLayerUpload",
          "ecr-public:PutImage",
          "ecr-public:DescribeRepositories",
          "ecr-public:BatchGetImage",
          "ecr-public:BatchCheckLayerAvailability",
        ],
        resources: ["*"],
      }),
    );

    // Outputs
    new cdk.CfnOutput(this, "BackendPublicEcrUri", {
      value: `public.ecr.aws/${this.account}/ems-backend`,
    });

    new cdk.CfnOutput(this, "WebPublicEcrUri", {
      value: `public.ecr.aws/${this.account}/ems-web`,
    });

    new cdk.CfnOutput(this, "GitHubActionsRoleArn", {
      value: githubActionsRole.roleArn,
    });

    new cdk.CfnOutput(this, "BackendPublicEcrArn", {
      value: backendRepo.attrArn,
    });

    new cdk.CfnOutput(this, "WebPublicEcrArn", {
      value: webRepo.attrArn,
    });
  }
}
