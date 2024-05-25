import "@stdlib/deploy";
import "@stdlib/ownable";
import "./lottery.tact";
import "./messages.tact";

contract LotteryAdmin with Ownable {
    const MIN_TON_FOR_STORAGE: Int = ton("0.1");
    const GAS_CONSUMPTION: Int = ton("0.015");
    const ROYALTY: Address = address("UQC1NmDnGpzILcUXGGY0w2bSwrKUxS6S_F_neQMpPfayH1rb");

    id: Int as uint8;
    nextLotteryId: Int as uint64 = 0;
    owner: Address;

    init(id: Int){
        self.id = id;
        self.owner = sender();
    }

    receive("withdraw"){
        self.requireOwner();

        let ctx: Context = context();


        let amountForRoyalty: Int = (myBalance() - ctx.value - self.GAS_CONSUMPTION) / 10;
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

    receive(msg: Deploy) {
    }

    receive(msg: Excesses) {
    }

    receive(msg: CreateLottery){
        require(msg.min_bet >= ton("0.2"), "Minimal bet is less than 0.2 ton");
        require(msg.goal_price >= ton("1"), "Minimal goal must be greater than 1 ton");
        require(msg.duration >= 14400 && msg.duration <= 604800, "Duration must be greater than 4 hours and less than 7 days");

        let ctx: Context = context();
        let msgValue: Int = ctx.value;
        let tonBalanceBeforeMsg: Int = (myBalance() - msgValue);
        let storageFee: Int = (self.MIN_TON_FOR_STORAGE - min(tonBalanceBeforeMsg, self.MIN_TON_FOR_STORAGE));
        msgValue = (msgValue - (storageFee + self.GAS_CONSUMPTION));
        require(msgValue > ton("0.1"), "Not enough TON");

        msg.creator_address = ctx.sender;

        let init: StateInit = initOf Lottery(self.nextLotteryId, myAddress());
        let address: Address = contractAddress(init);
        send(SendParameters{
                to: address,
                value: msgValue,
                bounce: true,
                code: init.code,
                data: init.data,
                body: msg.toCell()
            }
        );

        self.nextLotteryId = self.nextLotteryId + 1;
    }

    bounced(src: bounced<CreateLottery>) {
        self.nextLotteryId = self.nextLotteryId - 1;
    }

    get fun get_lottery_address(id: Int): Address {
        return contractAddress(initOf Lottery(id, myAddress()));
    }
    get fun get_next_lottery_id(): Int {
        return self.nextLotteryId;
    }
}