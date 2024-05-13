import { toNano } from '@ton/core';
import { JackPotMaster } from '../wrappers/JackPotMaster';
import { NetworkProvider, createNetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    
    const jackPotMaster = provider.open(await JackPotMaster.fromInit(0n));

    await jackPotMaster.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    console.log(jackPotMaster.address);
    await provider.waitForDeploy(jackPotMaster.address);

}
