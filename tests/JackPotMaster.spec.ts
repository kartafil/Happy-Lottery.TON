import { Blockchain, SandboxContract, SendMessageResult, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Address, BitReader, BitString, Cell, Slice, toNano } from '@ton/core';
import { JackPotMaster } from '../wrappers/JackPotMaster';
import { JackPot } from '../build/JackPotMaster/tact_JackPot';
import { NftCollection } from '../build/NftCollection/tact_NftCollection';
import { NftItem } from '../build/NftCollection/tact_NftItem';
import '@ton/test-utils';

describe('JackPotMaster', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let user: SandboxContract<TreasuryContract>;
    let player: SandboxContract<TreasuryContract>;
    let jackPotMaster: SandboxContract<JackPotMaster>;
    let jackPot: SandboxContract<JackPot>;
    let nftCollection: SandboxContract<NftCollection>;
    let nft: SandboxContract<NftItem>;
    let nftAddressFromCollection: Address;

    const GOAL = toNano('100');
    const MIN_BET = toNano('0.2');
    const DURATION = 3n;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        jest.useFakeTimers();

        jackPotMaster = blockchain.openContract(await JackPotMaster.fromInit(0n));
        deployer = await blockchain.treasury('deployer');
        user = await blockchain.treasury('user');
        player = await blockchain.treasury('player');

        await jackPotMaster.send(
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

        const createResult = await jackPotMaster.send(
            user.getSender(),
            {
                value: toNano('0.15'),
                bounce: false
            },
            {
                $$type: 'CreateJackPot',
                query_id: 0n,
                duration: DURATION,
                goal_price: GOAL,
                min_bet: MIN_BET,
                user_address: null
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

        await nftCollection.send(
            deployer.getSender(),
            {
                value: toNano('0.5')
            },
            {
                $$type: 'Mint',
                query_id: 0n
            }
        );

        jackPot = blockchain.openContract(await JackPot.fromAddress(await jackPotMaster.getGetJackpotAddress(0n)));

        nftAddressFromCollection = await nftCollection.getGetNftAddressByIndex(0n) as Address;
        nft = blockchain.openContract(await NftItem.fromAddress(nftAddressFromCollection));

        await nft.send(
            deployer.getSender(),
            {
                value: toNano('0.1')
            },
            {
                $$type: 'Transfer',
                query_id: 0n,
                new_owner: jackPot.address,
                response_destination: deployer.address,
                custom_payload: null,
                forward_amount: toNano('0.01'),
                forward_payload: Cell.EMPTY
            }
        )

        expect((await jackPot.getGetInfo()).nft_address).toEqualAddress(nftAddressFromCollection);
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and jackPotMaster are ready to use
    });


    it('should support more users', async () => {
        let users: SandboxContract<TreasuryContract>[] = [];
        const COUNT = 100;

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

        for (let i = 0; i < queue.length && i < GOAL / MIN_BET + 1n; i++) {
            let result = await jackPot.send(
                queue[i].user.getSender(),
                {
                    value: queue[i].bet
                },
                null
            );
            if (i === 0 || i === queue.length - 2) {
                printTransactionFees(result.transactions);
            }
            //console.log(await jackPot.getGetCurrentBalance());
            if ((await jackPot.getGetInfo()).isFinished) {
                console.log('Finished at ..>> ', i);
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
                        to: jackPotMaster.address,
                    }
                );
                break;
            }
        }

        expect((await jackPot.getGetInfo()).isFinished);

    });

    it('shouldn\'t refund', async () => {
        const p = new Promise((resolve) => {
            setTimeout(
                async () => {
                    const res = await jackPot.send
                        (
                            player.getSender(),
                            {
                                value: toNano('0.15'),
                                bounce: true
                            },
                            null
                        );
                    resolve(res);
                },
                3500
            );
        });

        jest.runAllTimers();
        let ref: SendMessageResult = ((await p) as SendMessageResult);
        printTransactionFees(ref.transactions);
        // expect(ref.transactions).toHaveTransaction({
        //     from: nftAddressFromCollection,
        //     to: user.address,
        // });

        ref = await jackPot.send
            (
                player.getSender(),
                {
                    value: toNano('0.05'),
                    bounce: true
                },
                null
            );

        printTransactionFees(ref.transactions);
    });


    it('should refund', async () => {
        let users: SandboxContract<TreasuryContract>[] = [];
        const COUNT = 100;

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


        for (let i = 0; i < 50; i++) {
            await jackPot.send(
                queue[i].user.getSender(),
                {
                    value: queue[i].bet
                },
                null
            );
        }

        const p = new Promise((resolve) => {
            setTimeout(
                async () => {
                    const res = await jackPot.send
                        (
                            queue[10].user.getSender(),
                            {
                                value: toNano('0.2')
                            },
                            null
                        );
                    resolve(res);
                },
                3500
            );
        });

        jest.runAllTimers();

        let ref: SendMessageResult = ((await p) as SendMessageResult);
        printTransactionFees(ref.transactions);
        expect(ref.transactions).toHaveTransaction({
            from: nftAddressFromCollection,
            to: user.address,
        });
    });

    afterAll(() => {
        jest.clearAllTimers();
    });
});
