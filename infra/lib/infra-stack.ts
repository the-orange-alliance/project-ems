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

    // -------------------------------
    // Create IAM User and Roles
    // -------------------------------
    const backupUser = new iam.User(this, "BackupUser", {
      userName: "ems-backup-bot",
    });

    // Attach policy to allow S3 access for backups
    const backupPolicy = new iam.Policy(this, "BackupPolicy", {
      statements: [
        new iam.PolicyStatement({
          actions: ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
          resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
        }),
      ],
    });

    backupUser.attachInlinePolicy(backupPolicy);

    // Create an access key for programmatic access (SDK, CLI, Docker)
    const accessKey = new iam.CfnAccessKey(this, "BackupUserAccessKey", {
      userName: backupUser.userName,
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

    new cdk.CfnOutput(this, "BackupUserAccessKeyId", {
      value: accessKey.ref,
      description: "Access Key ID for ems-backup-bot",
    });

    new cdk.CfnOutput(this, "BackupUserSecretAccessKey", {
      value: accessKey.attrSecretAccessKey,
      description: "Secret Access Key for ems-backup-bot",
    });
  }
}
