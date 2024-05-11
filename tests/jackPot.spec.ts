import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, BitReader, BitString, Cell, Slice, toNano } from '@ton/core';
import { JackPot } from '../build/JackPotMaster/tact_JackPot';
import { NftCollection } from '../build/NftCollection/tact_NftCollection';
import { NftItem } from '../build/NftCollection/tact_NftItem';
import '@ton/test-utils';

describe('JackPotMaster', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let jackPot: SandboxContract<JackPot>;
    let nftCollection: SandboxContract<NftCollection>;
    let nft: SandboxContract<NftItem>;
    let addressFromCollection: Address;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        jackPot = blockchain.openContract(await JackPot.fromInit(0n, deployer.address, deployer.address));

        const deployResult = await jackPot.send(
            deployer.getSender(),
            {
                value: toNano('0.15'),
                bounce: false
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        const OFFCHAIN_CONTENT_PREFIX = 0x01;
        const metadata_link = "https://ivory-peaceful-xerinae-817.mypinata.cloud/ipfs/QmQfx8GsreZkQ3eXpa8MMZoYX6kYRoGgcp45bbiPUTmnki/"

        let content = new Cell().asBuilder().storeInt(OFFCHAIN_CONTENT_PREFIX, 8).storeStringRefTail(metadata_link).endCell();

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
        );

        const nftMintResult = await nftCollection.send(
            deployer.getSender(),
            {
                value: toNano('0.5')
            },
            {
                $$type: 'Mint',
                query_id: 0n
            }
        );

        addressFromCollection = await nftCollection.getGetNftAddressByIndex(0n) as Address;
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and jackPotMaster are ready to use
    });


    it('should send NFT back', async () => {
        const transactionsResult = await jackPot.send(
            deployer.getSender(),
            {
                value: toNano('0.5')
            },
            {
                $$type: 'GetNftBack',
                query_id: 0n,
                nft_address: addressFromCollection
            }
        );

        expect(transactionsResult.transactions).toHaveTransaction({
            op: 0x5fcc3d14
        })
    })
});
