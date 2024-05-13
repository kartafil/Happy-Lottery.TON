import { Address, toNano } from '@ton/core';
import { JackPot } from '../build/JackPotMaster/tact_JackPot';
import { jackPot_address } from './consts';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const jackPot = provider.open(await JackPot.fromAddress(jackPot_address));

    console.log(jackPot_address);
    await jackPot.send(
        provider.sender(),
        {
            value: toNano("0.5"),
            bounce: false
        },
        {
            $$type: 'Bet',
            query_id: 0n
        }
    )

}
