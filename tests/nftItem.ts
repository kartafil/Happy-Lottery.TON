import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, BitReader, BitString, Cell, Slice, toNano } from '@ton/core';
import { NftCollection } from '../build/NftCollection/tact_NftCollection';
import { NftItem } from '../build/NftCollection/tact_NftItem';
import '@ton/test-utils';

describe('JackPotMaster', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let receiver: SandboxContract<TreasuryContract>;
    let nftCollection: SandboxContract<NftCollection>;
    let nft: SandboxContract<NftItem>;
    const OFFCHAIN_CONTENT_PREFIX = 0x01;
    const metadata_link = "https://ivory-peaceful-xerinae-817.mypinata.cloud/ipfs/QmQfx8GsreZkQ3eXpa8MMZoYX6kYRoGgcp45bbiPUTmnki/"

    let content = new Cell().asBuilder().storeInt(OFFCHAIN_CONTENT_PREFIX, 8).storeStringRefTail(metadata_link).endCell();

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        receiver = await blockchain.treasury('receiver');

        nftCollection = blockchain.openContract(await NftCollection.fromInit(deployer.address, content, {
            $$type: "RoyaltyParams",
            numerator: 35n, // 350n = 35%
            denominator: 1000n,
            destination: deployer.address,
        }))
        const deployResult = await nftCollection.send(
            deployer.getSender(),
            {
                value: toNano('0.5')
            },
            {
                $$type: 'Deploy',
                queryId: 0n
            }
        )

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftCollection.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and jackPotMaster are ready to use
    });
    false && (() => {
    it('should send OwnershipAssigned', async () => {
        nftCollection = blockchain.openContract(await NftCollection.fromInit(deployer.address, content, {
            $$type: "RoyaltyParams",
            numerator: 35n, // 350n = 35%
            denominator: 1000n,
            destination: deployer.address,
        }))

        await nftCollection.send(
            deployer.getSender(),
            {
                value: toNano('0.5')
            },
            {
                $$type: 'Deploy',
                queryId: 0n
            }
        )

        const nftMintResult = await nftCollection.send(
            deployer.getSender(),
            {
                value: toNano('1')
            },
            {
                $$type: 'Mint',
                query_id: 0n
            }
        )

        const addressFromCollection = await nftCollection.getGetNftAddressByIndex(0n);

        nft = blockchain.openContract(
            await NftItem.fromAddress(addressFromCollection as Address)
        );
    
        // console.log('Before ..>>', (await nft.getGetNftData()).owner_address);
        
        const transferResult = await nft.send(
            deployer.getSender(),
            {
                value: toNano('50')
            },
            {
                $$type: 'Transfer',
                query_id: 0n,
                new_owner: receiver.address,
                response_destination: receiver.address,
                custom_payload: null,
                forward_amount: 1n,
                forward_payload: Cell.EMPTY
            }
        );
        // console.log('After ..>>',  (await nft.getGetNftData()).owner_address);
        await nftCollection.send(
            deployer.getSender(),
            {
                value: toNano('1')
            }, 
            {
                $$type: 'Mint',
                query_id: 0n
            }
        )

        // console.log('NFT ..>> ', nft.address);
        // console.log('Receiver ..>> ', receiver.address);

        // expect(transferResult.transactions).toHaveTransaction({
        //     op: 85167505
        // });
        //expect((await nft.getGetNftData()).owner_address).toEqualAddress(addressFromJackPot);
    })
})();
});
