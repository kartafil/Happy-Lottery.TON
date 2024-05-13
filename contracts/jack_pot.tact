import "@stdlib/ownable";
import "./messages.tact";

contract JackPot with Ownable {
    const MIN_TON_FOR_STORAGE: Int = ton("0.1");
    const GAS_CONSUMPTION: Int = ton("0.035");

    id: Int as uint64;
    user: Address; // Адрес владельца 
    owner: Address; // Адрес JackPotMaster
    winner: Address? = null;
    nft: Address? = null;
    totalBets: Int as coins = 0;
    goalPrice: Int as coins = ton("100");
    minBet: Int as coins = ton("0.2");
    nftReceived: Bool = false;
    isStarted: Bool = false;
    isFinished: Bool = false;
    timeOfNftReceived: Int as uint32 = 0;
    nextBetId: Int as uint32 = 0;
    bets: map<Int, Bet>;


    init(id: Int, user: Address, owner: Address) {
        self.id = id;
        self.user = user;
        self.owner = owner;
        self.bets = emptyMap();
        //nativePrepareRandom();
    }

    fun requireCreator() {
        require(sender() == self.user, "Needs user");
    }

    fun requireNft() {
        require(self.nft != null, "Contract can't found NFT");
    }

    fun finish() {
        self.isFinished = true;

        let i: Int = 0;
        let amount: Int = 0;
        nativeRandomize(now() / myBalance() + self.nextBetId);

        let winNumber: Int = random(0, self.goalPrice);


        dump(winNumber);
        while(self.winner == null && i < self.nextBetId) {
            amount = amount + self.bets.get(i)!!.amount;
            if (amount >= winNumber) {
                self.winner = self.bets.get(i)!!.address;       
            }
            i = i + 1;
        }
        dump(self.winner);
        dump(myBalance());
        send(SendParameters {
            to: myAddress(),
            value: 0,
            mode: SendRemainingBalance + SendIgnoreErrors,
            body: FinishJackPot{
                query_id: 0
            }.toCell(),
            bounce: false
        });
    }

    receive(msg: CreateJackPot) {
        let ctx: Context = context();
    
        let msgValue: Int = ctx.value; // Check the gasCost for storage
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
        let storageFee: Int = self.MIN_TON_FOR_STORAGE - min(tonBalanceBeforeMsg, self.MIN_TON_FOR_STORAGE);
        msgValue = msgValue - (storageFee + self.GAS_CONSUMPTION);

        require(msgValue > 0, "invalid amount");

        send(SendParameters{
                to: self.user,
                value: msgValue,
                mode:  SendIgnoreErrors,
                body: Excesses { query_id: msg.query_id }.toCell() //0xd53276db
            });
    }

    receive("bet") {
        let ctx: Context = context();
        require(!self.isFinished, "Jackpot is finished");
        require(self.nft != null, "Contract doesn't have nft");
        require(ctx.value >= self.minBet, "Not enough TON to make bet");
        
        self.bets.set(self.nextBetId, Bet{ address: ctx.sender, amount: ctx.value });

        self.totalBets = self.totalBets + ctx.value;

        if(self.totalBets >= self.goalPrice) {
            dump("finish");
            dump(ctx.readForwardFee());
            self.finish();
        }
    }

    receive(msg: FinishJackPot) {
        if (self.isFinished) {
            let amountForUser: Int = myBalance() / 100 * 90 - self.GAS_CONSUMPTION * 2 - ton("0.1");
            let amountForOwner: Int = myBalance() - amountForUser - self.GAS_CONSUMPTION - self.MIN_TON_FOR_STORAGE;
            send(SendParameters {
                to: self.user,
                value: amountForUser,
                mode: 0,
                body: "JackPot payment".asComment(),
                bounce: false
            });
            send(SendParameters {
                to: self.owner,
                value: amountForOwner,
                mode: 0,
                body: "JackPot payment".asComment(),
                bounce: false
            });
            send(SendParameters{
                to: self.nft!!,
                value: ton("0.1"),
                mode: SendIgnoreErrors,
                bounce: true,
                body: Transfer{
                query_id: 0,   
                new_owner: self.winner!!,
                response_destination: self.user,
                custom_payload: emptyCell(),
                forward_amount: 1,
                forward_payload: emptySlice() 
                }.toCell()
            });
        }
    }

    receive(msg: GetNftBack) {
        send(SendParameters{
            to: msg.nft_address,
            value: context().value - self.GAS_CONSUMPTION,
            mode: 0,
            bounce: true,
            body: Transfer{
                query_id: 0,   
                new_owner: self.user,
                response_destination: self.user,
                custom_payload: emptyCell(),
                forward_amount: 1,
                forward_payload: emptySlice() 
            }.toCell()
        });
    }

    receive(msg: CheckNftOwnership) {   
        let ctx: Context = context();
        
        send(SendParameters{
            to: msg.nft_address,
            value: ctx.value - self.GAS_CONSUMPTION,
            mode: SendIgnoreErrors,
            bounce: true,
            body: Transfer{
                query_id: 0,   
                new_owner: myAddress(),
                response_destination: myAddress(),
                custom_payload: emptyCell(),
                forward_amount: 0,
                forward_payload: emptySlice() 
            }.toCell()
        });

        self.nft = msg.nft_address;
        dump(now());
    }

    bounced(src: bounced<Transfer>) {
//finish
        dump(now());
        dump("bounced");
        self.nft = null;
    }

    receive(msg: OwnershipAssigned) {
        self.nft = sender();
    }

    get fun get_nft_address(): Address? {
        return self.nft;
    }

    get fun is_finished(): Bool {
        return self.isFinished;
    }

    get fun get_current_bets_ammount(): Int {
        return self.totalBets;
    }

    get fun get_current_balance(): Int {
        return myBalance();
    }

    get fun get_bets(): map<Int, Bet> {
        return self.bets;
    }
}
