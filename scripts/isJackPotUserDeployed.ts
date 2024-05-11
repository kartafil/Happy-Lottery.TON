import { Address, toNano } from '@ton/core';
import { JackPotUser } from '../build/JackPotMaster/tact_JackPotUser';
import { NetworkProvider } from '@ton/blueprint';
import { jackPotMaster_address, my_wallet } from './consts';

export async function run(provider: NetworkProvider) {
    const jackPotUser = provider.open(await JackPotUser.fromInit(my_wallet, jackPotMaster_address)); //EQA4IL4G97HYLO-UFZbLJbQ_b9j0q3wnDHNhCp8CinvNw5s5

    await provider.isContractDeployed(jackPotUser.address) 
        && console.log('JackPotUser is deployed ..>> ', jackPotUser.address);
    
}
