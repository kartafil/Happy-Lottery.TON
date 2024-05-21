import { Address, toNano } from '@ton/core';
import { JackPotMaster } from '../wrappers/JackPotMaster';
import { JackPotUser } from '../build/JackPotMaster/tact_JackPotUser';
import { NetworkProvider } from '@ton/blueprint';
import { jackPotMaster_address, my_wallet } from './consts';
import { JackPot } from '../build/JackPotMaster/tact_JackPot';

export async function run(provider: NetworkProvider) {
    const jackPotMaster = provider.open(await JackPotMaster.fromAddress(jackPotMaster_address));
    
    await jackPotMaster.send(
        provider.sender(),
        {
            value: toNano('0.15'),
        },
        {
            $$type: 'CreateJackPot',
            query_id: 0n,
            duration: 3600n,
            min_bet: toNano('0.3'),
            goal_price: toNano('3'),
            user_address: null
        }
    );

    const jackPot = provider.open(await JackPot.fromAddress(await jackPotMaster.getGetJackpotAddress(0n)));
    
    console.log(jackPot.address);
    await provider.waitForDeploy(jackPot.address);

    console.log('JackPotUser deployed ..>> ', jackPot.address);
    
}
