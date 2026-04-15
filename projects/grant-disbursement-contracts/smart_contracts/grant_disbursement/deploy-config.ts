import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { GrantDisbursementFactory } from '../artifacts/grant_disbursement/GrantDisbursementClient'

export async function deploy() {
  console.log('=== Deploying GrantDisbursement ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(GrantDisbursementFactory, {
    defaultSender: deployer.addr,
  })

  const { appClient, result } = await factory.deploy({
    createParams: {
      method: 'createGrant',
      args: {
        grantName: 'Student Research Grant',
        numMilestones: 2n,
      },
    },
    onUpdate: 'append',
    onSchemaBreak: 'append',
  })

  console.log(
    `Deployed GrantDisbursement (app ID: ${appClient.appClient.appId}) at ${appClient.appAddress}`,
  )
  console.log(`Operation: ${result.operationPerformed}`)
}
