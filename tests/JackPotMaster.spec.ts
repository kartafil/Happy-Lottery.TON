import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, BitReader, BitString, Cell, Slice, toNano } from '@ton/core';
import { JackPotMaster } from '../wrappers/JackPotMaster';
import { JackPotUser } from '../build/JackPotMaster/tact_JackPotUser';
import { JackPot } from '../build/JackPotMaster/tact_JackPot';
import { NftCollection } from '../build/NftCollection/tact_NftCollection';
import { NftItem } from '../build/NftCollection/tact_NftItem';
import '@ton/test-utils';

describe('JackPotMaster', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let jackPotMaster: SandboxContract<JackPotMaster>;
    let jackPotUser: SandboxContract<JackPotUser>;
    let jackPot: SandboxContract<JackPot>;
    let nftCollection: SandboxContract<NftCollection>;
    let nft: SandboxContract<NftItem>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        jackPotMaster = blockchain.openContract(await JackPotMaster.fromInit(0n));
        deployer = await blockchain.treasury('deployer');

        const deployResult = await jackPotMaster.send(
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

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: jackPotMaster.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and jackPotMaster are ready to use
    });


    it('should create JackPotUser', async () => {
        let creationResult = await jackPotMaster.send(
            deployer.getSender(),
            {
                value: toNano('0.5')
            },
            {
                $$type: 'CreateJackPotUser',
                query_id: 0n
            }
        );


        jackPotUser = blockchain.openContract(
            await JackPotUser.fromInit(
                deployer.address,
                jackPotMaster.address
            )
        );

        expect(creationResult.transactions).toHaveTransaction({
            from: jackPotMaster.address,
            to: jackPotUser.address
        });
    })

    it('should create JackPot', async () => {
        let creationResult = await jackPotMaster.send(
            deployer.getSender(),
            {
                value: toNano('0.5')
            },
            {
                $$type: 'CreateJackPotUser',
                query_id: 0n
            }
        );


        jackPotUser = blockchain.openContract(
            await JackPotUser.fromInit(
                deployer.address,
                jackPotMaster.address
            )
        );

        creationResult = await jackPotUser.send(
            deployer.getSender(),
            {
                value: toNano('0.5')
            },
            {
                $$type: 'CreateJackPot',
                query_id: 0n
            }
        );


        jackPot = blockchain.openContract(
            await JackPot.fromInit(
                0n,
                deployer.address,
                jackPotMaster.address
            )
        );

        expect(creationResult.transactions).toHaveTransaction({
            from: jackPotUser.address,
            to: jackPot.address
        });
    })

    it('should get received NFT address', async () => {
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
        )

        const nftMintResult = await nftCollection.send(
            deployer.getSender(),
            {
                value: toNano('0.5')
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


        jackPot = blockchain.openContract(
            await JackPot.fromInit(
                0n,
                deployer.address,
                deployer.address
            )
        );

        await jackPot.send(
            deployer.getSender(),
            {
                value: toNano('0.5')
            },
            {
                $$type: 'Deploy',
                queryId: 0n
            }
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
                new_owner: jackPot.address,
                response_destination: jackPot.address,
                custom_payload: null,
                forward_amount: 10n,
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
        // console.log('JackPot ..>> ', jackPot.address);
        const addressFromJackPot = await jackPot.getGetNftAddress();
        // console.log(addressFromJackPot);


        // expect(transferResult.transactions).toHaveTransaction({
        //     op: 85167505
        // });
        //expect((await nft.getGetNftData()).owner_address).toEqualAddress(addressFromJackPot);
    })
});
