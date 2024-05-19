import "@stdlib/deploy";
import "@stdlib/ownable";
import "./jack_pot.tact";
import "./messages.tact";

contract JackPotMaster with Deployable, Ownable {
    const MIN_TON_FOR_STORAGE: Int = ton("0.1");
    const GAS_CONSUMPTION: Int = ton("0.03");
    id: Int as uint8;
    nextJackPotId: Int as uint64 = 0;
    owner: Address;
    init(id: Int){
        self.id = id;
        self.owner = sender();
    }

    receive("withdraw"){
        self.requireOwner();
        send(SendParameters{
                to: sender(),
                bounce: true,
                value: 0,
                mode: ((myBalance() - context().value) - self.MIN_TON_FOR_STORAGE)
            }
        );
    }

    receive(msg: CreateJackPot){
        msg.user_address = sender();

        let ctx: Context = context(); // get sender Info
        let msgValue: Int = ctx.value;
        let tonBalanceBeforeMsg: Int = (myBalance() - msgValue);
        //Если баланс до получения сообщения был больше необходимой на хранилище суммы, то плата за хранилище будет равна 0
        let storageFee: Int = (self.MIN_TON_FOR_STORAGE - min(tonBalanceBeforeMsg, self.MIN_TON_FOR_STORAGE));
        msgValue = (msgValue - (storageFee + self.GAS_CONSUMPTION));

        let init: StateInit = initOf JackPot(self.nextJackPotId, myAddress());
        let address: Address = contractAddress(init);
        send(SendParameters{
                to: address,
                value: msgValue,
                mode: SendIgnoreErrors,
                bounce: false,
                code: init.code,
                data: init.data,
                body: msg.toCell()
            }
        );

        self.nextJackPotId = self.nextJackPotId + 1;
    }

    bounced(src: bounced<CreateJackPot>) {
        self.nextJackPotId = self.nextJackPotId - 1;
    }

    get fun get_jackpot_address(id: Int): Address {
        return contractAddress(initOf JackPot(id, myAddress()));
    }
}