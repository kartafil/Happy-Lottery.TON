import { Address, toNano } from '@ton/core';
import { JackPotUser } from '../build/JackPotMaster/tact_JackPotUser';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const testnet_wallet = Address.parse('EQD0XA0CJtN_GkwFwiNGrmc6e2GBBAlMHysTKCKqlEkxxs3u');
    const jackPotMaster = Address.parse('EQApdwTqVSdi5zLTLUQwATIDny7wENJn5zptaCF3RGBHOI1U');
    const jackPotUser = provider.open(await JackPotUser.fromInit(testnet_wallet, jackPotMaster));

    await jackPotUser.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(jackPotUser.address);

    console.log('JackPotUser deployed');
    
}
