import { Blockchain, SandboxContract, SendMessageResult, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Address, BitReader, BitString, Cell, Slice, toNano, Dictionary } from '@ton/core';
import { JackPot } from '../wrappers/JackPot';
import { NftCollection } from '../build/NftCollection/tact_NftCollection';
import { NftItem } from '../build/NftCollection/tact_NftItem';
import '@ton/test-utils';
import { randomInt } from 'crypto';

describe('JackPot', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let jackPot: SandboxContract<JackPot>;
    let nftCollection: SandboxContract<NftCollection>;
    let nftFromCollection: SandboxContract<NftItem>;
    let nftAddressFromCollection: Address;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        user1 = await blockchain.treasury('user1');
        user2 = await blockchain.treasury('user2');
        jackPot = blockchain.openContract(await JackPot.fromInit(0n, deployer.address, deployer.address));

        const deployResult = await jackPot.send(
            deployer.getSender(),
            {
                value: toNano('0.15'),
                bounce: false
            },
            {
                $$type: 'CreateJackPot',
                query_id: 0n,
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

        nftAddressFromCollection = await nftCollection.getGetNftAddressByIndex(0n) as Address;
        nftFromCollection = blockchain.openContract(await NftItem.fromAddress(nftAddressFromCollection));
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
                nft_address: nftAddressFromCollection
            }
        );

        expect(transactionsResult.transactions).toHaveTransaction({
            op: 0x5fcc3d14
        })
    });

    it('should check NFT', async () => {

        const result = await jackPot.send(
            deployer.getSender(),
            {
                value: toNano(0.05)
            },
            {
                $$type: 'CheckNftOwnership',
                query_id: 0n,
                nft_address: nftAddressFromCollection
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: nftAddressFromCollection,
            inMessageBounced: true
        });
    });

    it('should accept NFT', async () => {
        const result = await nftFromCollection.send(
            deployer.getSender(),
            {
                value: toNano('1'),
            },
            {
                $$type: 'Transfer',
                query_id: 0n,
                new_owner: jackPot.address,
                response_destination: deployer.address,
                custom_payload: null,
                forward_amount: 1n,
                forward_payload: Cell.EMPTY
            }
        );

        expect(result.transactions).toHaveTransaction({
            to: jackPot.address,
            op: 0x05138d91
        });
        expect(result.transactions).toHaveTransaction({
            to: deployer.address,
            op: 0xd53276db
        });
    });

    it('should accept bets', async () => {
        await nftFromCollection.send(
            deployer.getSender(),
            {
                value: toNano('1'),
            },
            {
                $$type: 'Transfer',
                query_id: 0n,
                new_owner: jackPot.address,
                response_destination: deployer.address,
                custom_payload: null,
                forward_amount: 1n,
                forward_payload: Cell.EMPTY
            }
        );

        await jackPot.send(
            deployer.getSender(),
            {
                value: toNano(0.05)
            },
            {
                $$type: 'CheckNftOwnership',
                query_id: 0n,
                nft_address: nftAddressFromCollection
            }
        );

        const before = await jackPot.getGetCurrentBetsAmmount();
        const result = await jackPot.send(
            deployer.getSender(),
            {
                value: toNano('0.5')
            },
            {
                $$type: 'Bet',
                query_id: 0n
            }
        );
        const after = await jackPot.getGetCurrentBetsAmmount();
        expect(after).toBeGreaterThan(before);
    });

    it('should finish jackPot', async () => {
        const dict = Dictionary.empty(Dictionary.Keys.BigInt(32), Dictionary.Values.Address());
        console.log("init balance")
        //toNano('0.123991')
        console.log(await jackPot.getGetCurrentBalance())

        const nftTransfer = await nftFromCollection.send(
            deployer.getSender(),
            {
                value: toNano('1'),
            },
            {
                $$type: 'Transfer',
                query_id: 0n,
                new_owner: jackPot.address,
                response_destination: deployer.address,
                custom_payload: null,
                forward_amount: 1n,
                forward_payload: Cell.EMPTY
            }
        );

        await jackPot.send(
            deployer.getSender(),
            {
                value: toNano(0.05)
            },
            {
                $$type: 'CheckNftOwnership',
                query_id: 0n,
                nft_address: nftAddressFromCollection
            }
        );
        console.log(await jackPot.getGetCurrentBalance())
        //toNano('0.139296')
        await jackPot.send(
            user1.getSender(),
            {
                value: toNano('20')
            },
            {
                $$type: 'Bet',
                query_id: 0n
            }
        );
        console.log(await jackPot.getGetCurrentBetsAmmount());
        await jackPot.send(
            user2.getSender(),
            {
                value: toNano('30')
            },
            {
                $$type: 'Bet',
                query_id: 0n
            }
        );
        console.log(await jackPot.getGetCurrentBetsAmmount());
        await jackPot.send(
            user2.getSender(),
            {
                value: toNano('45')
            },
            {
                $$type: 'Bet',
                query_id: 0n
            }
        );
        const bef = await deployer.getBalance();
        console.log(bef);
        console.log(await jackPot.getGetCurrentBetsAmmount());
        const result = await jackPot.send(
            user1.getSender(),
            {
                value: toNano('10'),
                bounce: false
            },
            {
                $$type: 'Bet',
                query_id: 0n
            }
        );
        console.log(await deployer.getBalance() - bef);

        expect(result.transactions).toHaveTransaction(
            {
                from: jackPot.address,
                op: 0x5fcc3d14
            }
        );
        expect(result.transactions).toHaveTransaction(
            {
                from: jackPot.address,
                to: deployer.address,
            }
        );
    });

    it('should support more users', async () => {
        const nftTransfer = await nftFromCollection.send(
            deployer.getSender(),
            {
                value: toNano('1'),
            },
            {
                $$type: 'Transfer',
                query_id: 0n,
                new_owner: jackPot.address,
                response_destination: deployer.address,
                custom_payload: null,
                forward_amount: 1n,
                forward_payload: Cell.EMPTY
            }
        );

        await jackPot.send(
            deployer.getSender(),
            {
                value: toNano(0.05)
            },
            {
                $$type: 'CheckNftOwnership',
                query_id: 0n,
                nft_address: nftAddressFromCollection
            }
        );


        let users: SandboxContract<TreasuryContract>[] = [];
        const COUNT = 100;
        const GOAL = 100;
        const MIN_BET = 1;

        for (let i = 0; i < COUNT; i++) {
            users.push(await blockchain.treasury(i.toString()));
        }
        let queue: { user: SandboxContract<TreasuryContract>; bet: bigint }[] = [];
        for (let i = 0; i < COUNT; i++) {
            for (let j = 0; j < 1; j++) {
                queue.push({ user: users[i], bet: toNano(`1`) });
            }
        }

        for (let i = queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue[i], queue[j]] = [queue[j], queue[i]];
        }

        //console.log(queue);
        const bef = await deployer.getBalance();
        console.log(bef);

        for (let i = 0; i < queue.length && i < GOAL / MIN_BET + 1; i++) {
            let result = await jackPot.send(
                queue[i].user.getSender(),
                {
                    value: queue[i].bet
                },
                {
                    $$type: 'Bet',
                    query_id: 0n
                }
            );
            //console.log(await jackPot.getGetCurrentBalance());
            if (await jackPot.getIsFinished()) {
                console.log('Finished at ..>> ', i);
                console.log(await deployer.getBalance() - bef);
                //console.log(await jackPot.getGetParticipants());
                printTransactionFees(result.transactions);
                expect(result.transactions).toHaveTransaction(
                    {
                        from: jackPot.address,
                        op: 0x5fcc3d14
                    }
                );
                expect(result.transactions).toHaveTransaction(
                    {
                        from: jackPot.address,
                        to: deployer.address,
                    }
                );
                break;
            }
        }

        expect(await jackPot.getIsFinished());

    });
});
