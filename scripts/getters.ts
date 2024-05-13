import { Address, toNano } from '@ton/core';
import { JackPotMaster } from '../wrappers/JackPotMaster';
import { JackPotUser } from '../build/JackPotMaster/tact_JackPotUser';
import { JackPot } from '../build/JackPotMaster/tact_JackPot';
import { jackPotMaster_address, jackPotUser_address, jackPot_address } from './consts';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const jackPotMaster = provider.open(await JackPotMaster.fromAddress(jackPotMaster_address));
    const jackPotUser = provider.open(await JackPotUser.fromAddress(jackPotUser_address));
    const jackPot = provider.open(await JackPot.fromAddress(jackPot_address));

    console.log(await jackPot.getGetNftAddress());

}
