/* eslint-disable import/no-extraneous-dependencies */
import { Stack, Duration } from 'aws-cdk-lib';
import {
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
  Connections,
} from 'aws-cdk-lib/aws-ec2';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

interface LambdaResourcesProps {
  fargateService: ApplicationLoadBalancedFargateService;
  vpc: Vpc;
  fargateSecurityGroup: SecurityGroup;
}

export class LambdaResources extends Construct {
  constructor(scope: Construct, id: string, props: LambdaResourcesProps) {
    super(scope, id);

    const lambdaRole = new Role(this, 'lambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaVPCAccessExecutionRole',
        ),
      ],
    });

    const lambdaSecurityGroup = new SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: props.vpc,
    });

    lambdaSecurityGroup.addEgressRule(props.fargateSecurityGroup, Port.tcp(80));

    props.fargateSecurityGroup.connections.allowFrom(
      new Connections({
        securityGroups: [lambdaSecurityGroup],
      }),
      Port.tcp(80),
      'allow traffic on port 80 from the Lambda security group',
    );

    const fargateLambdaInPrivateVPCwithSG = new NodejsFunction(
      this,
      'fargateLambdaInPrivateVPCwithSG',
      {
        entry: 'src/resources/fargateLambda/index.ts',
        runtime: Runtime.NODEJS_LATEST,
        architecture: Architecture.ARM_64,
        role: lambdaRole,
        timeout: Duration.seconds(60),
        vpc: props.vpc,
        vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [lambdaSecurityGroup],
        environment: {
          FARGATE_ALB_URL:
            props.fargateService.loadBalancer.loadBalancerDnsName,
        },
      },
    );

    const fargateLambdaInPrivateVPC = new NodejsFunction(
      this,
      'fargateLambdaInPrivateVPC',
      {
        entry: 'src/resources/fargateLambda/index.ts',
        runtime: Runtime.NODEJS_LATEST,
        architecture: Architecture.ARM_64,
        role: lambdaRole,
        timeout: Duration.seconds(60),
        vpc: props.vpc,
        vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        environment: {
          FARGATE_ALB_URL:
            props.fargateService.loadBalancer.loadBalancerDnsName,
        },
      },
    );

    const fargateLambda = new NodejsFunction(this, 'fargateLambda', {
      entry: 'src/resources/fargateLambda/index.ts',
      runtime: Runtime.NODEJS_LATEST,
      architecture: Architecture.ARM_64,
      role: lambdaRole,
      timeout: Duration.seconds(60),
      environment: {
        FARGATE_ALB_URL: props.fargateService.loadBalancer.loadBalancerDnsName,
      },
    });

    new Rule(this, 'LambdaInvokeRule', {
      schedule: Schedule.rate(Duration.minutes(1)),
      targets: [
        new LambdaFunction(fargateLambdaInPrivateVPCwithSG),
        new LambdaFunction(fargateLambdaInPrivateVPC),
        new LambdaFunction(fargateLambda),
      ],
    });
  }
}
