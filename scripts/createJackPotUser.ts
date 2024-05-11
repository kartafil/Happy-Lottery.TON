import { Address, toNano } from '@ton/core';
import { JackPotMaster } from '../wrappers/JackPotMaster';
import { JackPotUser } from '../build/JackPotMaster/tact_JackPotUser';
import { NetworkProvider } from '@ton/blueprint';
import { jackPotMaster_address, my_wallet } from './consts';

export async function run(provider: NetworkProvider) {
    const jackPotMaster = provider.open(await JackPotMaster.fromAddress(jackPotMaster_address));
    const jackPotUser = provider.open(await JackPotUser.fromInit(my_wallet, jackPotMaster.address));

    await jackPotMaster.send(
        provider.sender(),
        {
            value: toNano('0.7'),
        },
        {
            $$type: 'CreateJackPotUser',
            query_id: 0n,
            response_destination: provider.sender().address as Address
        }
    );
    console.log(jackPotUser.address);
    await provider.waitForDeploy(jackPotUser.address);

    console.log('JackPotUser deployed ..>> ', jackPotUser.address);
    
}
