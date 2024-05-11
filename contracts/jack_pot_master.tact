import "@stdlib/deploy";
import "@stdlib/ownable";
import "./jack_pot_user.tact";
import "./messages.tact";


contract JackPotMaster with Deployable, Ownable {
    const MIN_TON_FOR_STORAGE: Int = ton("0.1");
    const GAS_CONSUMPTION: Int = ton("0.03");

    id: Int as uint8;
    owner: Address;

    get fun get_jackpot_user_address(address: Address): Address {
        return contractAddress(initOf JackPotUser(address, self.owner));
    }

    init(id: Int) {
        self.id = id;
        self.owner = sender();
    }

    receive("withdraw") {
        self.requireOwner();
        send(SendParameters {
            to: sender(),
            bounce: true,
            value: 0,
            mode: myBalance() - context().value - self.MIN_TON_FOR_STORAGE
        });
    }

    receive(msg: CreateJackPotUser) {
        let ctx: Context = context(); // get sender Info
        let msgValue: Int = ctx.value;
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
        //Если баланс до получения сообщения был больше необходимой на хранилище суммы, то плата за хранилище будет равна 0
        let storageFee: Int = self.MIN_TON_FOR_STORAGE - min(tonBalanceBeforeMsg, self.MIN_TON_FOR_STORAGE);
        msgValue = msgValue - (storageFee + self.GAS_CONSUMPTION);

        self.createJackPotUser(ctx.sender, msgValue);
    }

    fun createJackPotUser(newUser: Address, msgValue: Int) {
        let init: StateInit = initOf JackPotUser(newUser, myAddress());
        let address: Address = contractAddress(init);
            
        send(SendParameters{
            to: address,
            value: msgValue,
            mode: SendIgnoreErrors,
            bounce: false,
            code: init.code,
            data: init.data,
            body: CreateJackPotUser{ query_id: 0, response_destination: newUser }.toCell()
        });
    }
}