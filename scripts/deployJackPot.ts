import { toNano } from '@ton/core';
import { JackPot } from '../build/JackPot/tact_JackPot';
import { NetworkProvider } from '@ton/blueprint';
import { my_wallet } from './consts';

export async function run(provider: NetworkProvider) {
    const jackPot = provider.open(await JackPot.fromInit(0n, my_wallet, my_wallet));

    await jackPot.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        {
            $$type: 'CreateJackPot',
            query_id: 0n,
        }
    );

    console.log(jackPot.address);
    await provider.waitForDeploy(jackPot.address);

}
