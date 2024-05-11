import { Address, toNano } from '@ton/core';
import { JackPotUser } from '../build/JackPotMaster/tact_JackPotUser';
import { JackPot } from '../build/JackPotMaster/tact_JackPot';
import { NetworkProvider } from '@ton/blueprint';
import { jackPotMaster_address, jackPotUser_address } from './consts';

export async function run(provider: NetworkProvider) {
    const jackPotUser = provider.open(await JackPotUser.fromAddress(jackPotUser_address));
    const jackPot = provider.open(await JackPot.fromInit(0n, jackPotUser.address, jackPotMaster_address));
    
    console.log(jackPot.address);
    await jackPotUser.send(
        provider.sender(),
        {
            value: toNano('0.5'),
        },
        {
            $$type: 'CreateJackPot',
            query_id: 0n
        }
    );
    await provider.waitForDeploy(jackPot.address);

    console.log('JackPot is deployed ..>> ', jackPot.address);
    
}
