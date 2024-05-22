import "@stdlib/deploy";
import "@stdlib/ownable";
import "./jack_pot.tact";
import "./messages.tact";

contract JackPotMaster with Ownable {
    const MIN_TON_FOR_STORAGE: Int = ton("0.1");
    const GAS_CONSUMPTION: Int = ton("0.015");
    const ROYALTY: Address = address("UQC1NmDnGpzILcUXGGY0w2bSwrKUxS6S_F_neQMpPfayH1rb");

    id: Int as uint8;
    nextJackPotId: Int as uint64 = 0;
    owner: Address;

    init(id: Int){
        self.id = id;
        self.owner = sender();
    }

    receive("withdraw"){
        self.requireOwner();

        let ctx: Context = context();


        let amountForRoyalty: Int = (myBalance() - ctx.value) / 10 - self.GAS_CONSUMPTION;
        let amountForOwner: Int = (myBalance() - ctx.value) / 10 * 9 - self.GAS_CONSUMPTION;

        send(SendParameters{
                to: self.ROYALTY,
                bounce: false,
                value: amountForRoyalty,
                mode: SendIgnoreErrors
        });

        send(SendParameters{
                to: self.owner,
                bounce: false,
                value: amountForOwner,
                mode: SendIgnoreErrors
            }
        );
    }

    receive() {
    }

    receive(msg: Deploy) {
    }

    receive(msg: Excesses) {
    }

    receive(msg: CreateJackPot){
        let ctx: Context = context();
        
        msg.user_address = ctx.sender;

        let msgValue: Int = ctx.value;
        let tonBalanceBeforeMsg: Int = (myBalance() - msgValue);
        let storageFee: Int = (self.MIN_TON_FOR_STORAGE - min(tonBalanceBeforeMsg, self.MIN_TON_FOR_STORAGE));
        msgValue = (msgValue - (storageFee + self.GAS_CONSUMPTION));

        let init: StateInit = initOf JackPot(self.nextJackPotId, myAddress());
        let address: Address = contractAddress(init);
        send(SendParameters{
                to: address,
                value: msgValue,
                mode: SendIgnoreErrors,
                bounce: true,
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
    get fun get_next_jackpot_id(): Int {
        return self.nextJackPotId;
    }
}