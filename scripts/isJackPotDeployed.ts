import { Address, toNano } from '@ton/core';
import { JackPot } from '../build/JackPotMaster/tact_JackPot';
import { NetworkProvider } from '@ton/blueprint';
import { jackPot_address, my_wallet } from './consts';

export async function run(provider: NetworkProvider) {
    const jackPot = provider.open(await JackPot.fromAddress(jackPot_address)); //EQA4IL4G97HYLO-UFZbLJbQ_b9j0q3wnDHNhCp8CinvNw5s5

    await provider.isContractDeployed(jackPot.address) 
        && console.log('JackPot is deployed ..>> ', jackPot.address);

    console.log('Nft ..>> ', await jackPot.getGetNftAddress())
    
}
