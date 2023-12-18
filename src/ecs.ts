import { SecurityGroup, Port, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import {
  ContainerImage,
  CpuArchitecture,
  OperatingSystemFamily,
} from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import {
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface ECSResourcesProps {
  vpc: Vpc;
  applicationLoadBalancer: ApplicationLoadBalancer;
  fargateSecurityGroup: SecurityGroup;
}

export class ECSResources extends Construct {
  fargateService: ApplicationLoadBalancedFargateService;
  constructor(scope: Construct, id: string, props: ECSResourcesProps) {
    super(scope, id);

    const fargateTaskRole = new Role(this, 'fargateTaskRole', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      inlinePolicies: {
        ['CloudWatchPolicy']: new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: ['*'],
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
            }),
          ],
        }),
      },
    });

    this.fargateService = new ApplicationLoadBalancedFargateService(
      this,
      'fargateService',
      {
        taskImageOptions: {
          image: ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
          taskRole: fargateTaskRole,
        },
        publicLoadBalancer: false,
        vpc: props.vpc,
        assignPublicIp: false,
        openListener: false,
        loadBalancer: props.applicationLoadBalancer,
        listenerPort: 80,
        taskSubnets: {
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        securityGroups: [props.fargateSecurityGroup],
        runtimePlatform: {
          operatingSystemFamily: OperatingSystemFamily.LINUX,
          cpuArchitecture: CpuArchitecture.X86_64,
        },
      },
    );

    this.fargateService.service.connections.allowFrom(
      props.fargateSecurityGroup,
      Port.tcp(80),
    );
  }
}
