import { Address, toNano } from '@ton/core';
import { Lottery } from '../build/LotteryAdmin/tact_Lottery';
import { NftCollection } from '../build/NftCollection/tact_NftCollection';
import { NetworkProvider } from '@ton/blueprint';
import { lottery_address } from './consts';

export async function run(provider: NetworkProvider) {
    const lottery = provider.open(await Lottery.fromAddress(lottery_address)); //EQA4IL4G97HYLO-UFZbLJbQ_b9j0q3wnDHNhCp8CinvNw5s5
    const nftCollection = provider.open(await NftCollection.fromAddress(Address.parse('kQBryLnQ5LLqboe0qcsJcdxcKxihp-D02B2SxfOgVmXUA7jn')))

    const transaction = await lottery.send(
        provider.sender(),
        {
            value: toNano('0.5')
        },
        {
            $$type:'GetNftBack',
            query_id: 0n,
            nft_address: await nftCollection.getGetNftAddressByIndex(1n) as Address
        }
    )

    console.log(transaction);
}
