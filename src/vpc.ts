import { SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export class VPCResources extends Construct {
  public fargateSecurityGroup: SecurityGroup;
  public applicationLoadBalancer: ApplicationLoadBalancer;
  public vpc: Vpc;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.vpc = new Vpc(this, 'VPC', {
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PrivateSubnet',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: SubnetType.PUBLIC,
        },
      ],
      maxAzs: 2,
    });

    this.fargateSecurityGroup = new SecurityGroup(
      this,
      'fargateSecurityGroup',
      {
        vpc: this.vpc,
        description: 'Security Group for Fargate ALB',
      },
    );

    this.applicationLoadBalancer = new ApplicationLoadBalancer(this, 'alb', {
      vpc: this.vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      internetFacing: false,
      securityGroup: this.fargateSecurityGroup,
    });
  }
}
