import "@stdlib/deploy";
import "@stdlib/ownable";
import "./jack_pot.tact";
import "./messages.tact";

contract JackPotUser with Ownable {
    const MIN_TON_FOR_STORAGE: Int = ton("0.03");
    const GAS_CONSUMPTION: Int = ton("0.035");

    owner: Address; // JackPotMaster
    user: Address; // Пользователь JackPotUser
    next_jackpot_index: Int as uint64 = 0;


    init(user: Address, owner: Address) {
        self.user = user;
        self.owner = owner;
    }

    fun requireUser() {
        require(sender() == self.user, "Needs Jackpot creator");
    }

    receive(msg: CreateJackPotUser) {
        let ctx: Context = context();
    
        let msgValue: Int = ctx.value; // Check the gasCost for storage
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
        let storageFee: Int = self.MIN_TON_FOR_STORAGE - min(tonBalanceBeforeMsg, self.MIN_TON_FOR_STORAGE);
        msgValue = msgValue - (storageFee + self.GAS_CONSUMPTION);

        require(msgValue > 0, "invalid amount");

        dump(msgValue);
        dump(myBalance());
        send(SendParameters{
                to: self.user,
                value: msgValue,
                mode:  SendIgnoreErrors,
                body: Excesses { query_id: msg.query_id }.toCell() //0xd53276db
            });
        dump("Here ..>>>>>>>");
    }
    
    receive(msg: CreateJackPot) {
        require(self.next_jackpot_index >= 0, "Non-sequential JackPot");
        let ctx: Context = context();

        let msgValue: Int = ctx.value;
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
        let storageFee: Int = self.MIN_TON_FOR_STORAGE - min(tonBalanceBeforeMsg, self.MIN_TON_FOR_STORAGE);

        msgValue = msgValue - (storageFee + self.GAS_CONSUMPTION);

        let init: StateInit = 
        initOf JackPot(
            self.next_jackpot_index,
            self.user,
            self.owner
        );
        let address: Address = contractAddress(init);
            
        send(SendParameters{
            to: address,
            value: msgValue,
            mode: SendIgnoreErrors,
            bounce: true,
            code: init.code,
            data: init.data,
            body: msg.toCell()
        });

        self.next_jackpot_index = self.next_jackpot_index + 1;
    }

    get fun get_last_jackpot_address(): Address {
        return contractAddress(initOf JackPot(self.next_jackpot_index - 1, self.user, self.owner));
    }
}
