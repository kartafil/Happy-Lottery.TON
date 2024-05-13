import { Address, toNano, Cell } from '@ton/core';
import { JackPot } from '../build/JackPotMaster/tact_JackPot';
import { NftCollection } from '../build/NftCollection/tact_NftCollection';
import { NftItem } from '../build/NftCollection/tact_NftItem';
import { NetworkProvider } from '@ton/blueprint';
import { jackPot_address, my_wallet } from './consts';

export async function run(provider: NetworkProvider) {
    const jackPot = provider.open(await JackPot.fromAddress(jackPot_address)); //EQA4IL4G97HYLO-UFZbLJbQ_b9j0q3wnDHNhCp8CinvNw5s5
    const nftCollection = provider.open(await NftCollection.fromAddress(Address.parse('kQCB0bfbUnG5VTjvxBLB9jyLgNfX6VCkDks62gD5SXbJYqyG')))
    const nftItem = provider.open(await NftItem.fromAddress(await nftCollection.getGetNftAddressByIndex(1n) as Address));
    
    const transaction = await jackPot.send(
        provider.sender(),
        {
            value: toNano('0.6')
        },
        {
            $$type: 'CheckNftOwnership',
            query_id: 0n,
            nft_address: await nftCollection.getGetNftAddressByIndex(1n) as Address
        }
    )

    console.log(transaction);

    console.log('Nft ..>> ', Address.parseRaw('0:f45c0d0226d37f1a4c05c22346ae673a7b618104094c1f2b132822aa944931c6'))

}
