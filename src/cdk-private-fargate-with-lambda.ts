/* eslint-disable import/no-extraneous-dependencies */
import { App, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaResources, ECSResources, VPCResources } from './index';

export class PrivateFargateWithLambda extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const vpcResources = new VPCResources(this, 'vpcResources');

    const fargateResources = new ECSResources(this, 'fargateTask', {
      vpc: vpcResources.vpc,
      fargateSecurityGroup: vpcResources.fargateSecurityGroup,
      applicationLoadBalancer: vpcResources.applicationLoadBalancer,
    });

    new LambdaResources(this, 'lambdaResources', {
      fargateService: fargateResources.fargateService,
      vpc: vpcResources.vpc,
      fargateSecurityGroup: vpcResources.fargateSecurityGroup,
    });
  }
}

const app = new App();

new PrivateFargateWithLambda(app, 'PrivateFargateWithLambda');

app.synth();
