import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, BitReader, BitString, Cell, Slice, toNano } from '@ton/core';
import { JackPotMaster } from '../wrappers/JackPotMaster';
import { JackPotUser } from '../build/JackPotMaster/tact_JackPotUser';
import '@ton/test-utils';

describe('JackPotMaster', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let test: SandboxContract<TreasuryContract>;
    let jackPotMaster: SandboxContract<JackPotMaster>;
    let jackPotUser: SandboxContract<JackPotUser>;
    let addressFromCollection: Address;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        jackPotMaster = blockchain.openContract(await JackPotMaster.fromInit(0n));
        deployer = await blockchain.treasury('deployer');
        test = await blockchain.treasury('test');
        
        const result = await jackPotMaster.send(
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
        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: jackPotMaster.address,
            deploy: true,
            success: true
        })
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and jackPotUserMaster are ready to use
    });
    
    it('should send excesses', async () => {
        jackPotUser = blockchain.openContract(await JackPotUser.fromInit(deployer.address, jackPotMaster.address));

        const transaction = await jackPotMaster.send(
            deployer.getSender(),
            {
                value: toNano('1')
            },
            {
                $$type: 'CreateJackPotUser',
                query_id: 0n,
                response_destination: deployer.address
            }
        )

        expect(transaction.transactions).toHaveTransaction({
            from: jackPotUser.address,
        })
    });

});
