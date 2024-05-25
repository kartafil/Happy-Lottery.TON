import "./messages.tact";

contract Lottery {
    const MIN_TON_FOR_STORAGE: Int = ton("0.05");
    const GAS_CONSUMPTION: Int = ton("0.035");

    creator: Address? = null;
    owner: Address;
    nft: Address? = null;
    
    id: Int as uint64;
    bets: map<Int as uint32, Bet>;
    minBet: Int as coins = 0;
    nextBetId: Int as uint32 = 0;
    totalBets: Int as coins = 0;
    goalPrice: Int as coins = 0;
    duration: Int as uint32 = 0;
    deadline: Int as uint32 = 0;
    winner: Address? = null;
    isFinished: Bool = false;
    isRefunded: Bool = false;

    init(
        id: Int,
        owner: Address,
        ) {
        self.id = id;
        self.owner = owner;
        self.bets = emptyMap();
    }

    fun finish() {
        send(SendParameters {
            to: myAddress(),
            value: 0,
            mode: SendRemainingBalance,
            body: CalcWinner{
                query_id: 0
            }.toCell(),
            bounce: false
        });
    }

    fun refund() {
        send(SendParameters {
            to: myAddress(),
            value: 0,
            mode: SendRemainingBalance,
            body: RefundLottery{
                query_id: 0
            }.toCell(),
            bounce: true
        });
    }

    receive(msg: CreateLottery) {
        require(self.creator == null, "Lottery already created");
        require(msg.min_bet >= ton("0.2"), "Minimal bet must be greater than 0.2 ton");
        require(msg.goal_price >= ton("1"), "Minimal goal must be greater than 1 ton");
        require(msg.duration >= 14400 && msg.duration <= 604800, "Duration must be greater than 4 hours and less than 7 days");
        require(msg.creator_address != null, "Can't initialize lottery without creator_address");

        self.duration = msg.duration;
        self.goalPrice = msg.goal_price;
        self.minBet = msg.min_bet;
        self.creator = msg.creator_address;

        let ctx: Context = context();
    
        let msgValue: Int = ctx.value;
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
        let storageFee: Int = self.MIN_TON_FOR_STORAGE - min(tonBalanceBeforeMsg, self.MIN_TON_FOR_STORAGE);
        msgValue = msgValue - (storageFee + self.GAS_CONSUMPTION);

        require(msgValue > 0, "invalid amount");

        send(SendParameters{
                to: self.creator!!,
                value: msgValue,
                mode:  SendIgnoreErrors,
                body: Excesses { query_id: msg.query_id }.toCell()
            });
    }

    receive("bet") {
        require(self.nft != null, "Contract doesn't have nft");
        require(!self.isFinished && !self.isRefunded, "Lottery is finished");
        if (self.totalBets >= self.goalPrice) {
            self.finish();
            return;
        }
        if (now() >= self.deadline) {
            self.refund();
            return;
        }

        let ctx: Context = context();
        require(ctx.value >= self.minBet, "Not enough TON to make bet");
        let betAmount: Int = ctx.value;
        
        let excesses: Int = self.totalBets + ctx.value - self.goalPrice;

        if (excesses > 0) {
            betAmount = self.goalPrice - self.totalBets;
            send(SendParameters {
                to: ctx.sender,
                value: excesses,
                mode: SendIgnoreErrors,
                body: Excesses { query_id: 0 }.toCell()
            });
        }

        self.totalBets = self.totalBets + betAmount;

        self.bets.set(self.nextBetId, Bet{ address: ctx.sender, amount: betAmount });
        self.nextBetId = self.nextBetId + 1;

        if (self.totalBets >= self.goalPrice) {
            self.finish();
        }
    }

    receive(msg: CalcWinner) {
        require(self.winner == null, "Winner already calculated");
        require(self.totalBets >= self.goalPrice, "Goal is not reached");
        let i: Int = 0;
        let amount: Int = 0;

        nativeRandomize(now() / myBalance() + self.nextBetId);
        let winNumber: Int = random(0, self.goalPrice);

        while(self.winner == null && i < self.nextBetId) {
            amount = amount + self.bets.get(i)!!.amount;
            if (amount >= winNumber) {
                self.winner = self.bets.get(i)!!.address;
                self.bets = emptyMap(); 
            }
            i = i + 1;
        }

        send(SendParameters {
            to: myAddress(),
            value: 0,
            mode: SendRemainingBalance,
            body: FinishLottery{
                query_id: 0
            }.toCell(),
            bounce: false
        });
    }

    receive(msg: FinishLottery) {
        require(self.winner != null, "Winner isn't chosen");
        require(!self.isFinished, "Lottery is finished");
        self.isFinished = true;

        let amountForCreator: Int = myBalance() / 10 * 9 - self.GAS_CONSUMPTION - ton("0.1");
        send(SendParameters {
            to: self.creator!!,
            value: amountForCreator,
            mode: SendIgnoreErrors,
            body: "Happy-Lottery payment".asComment(),
            bounce: false
        });
        send(SendParameters{
            to: self.nft!!,
            value: ton("0.1"),
            bounce: true,
            body: Transfer{
            query_id: 0,   
            new_owner: self.winner!!,
            response_destination: self.owner,
            custom_payload: emptyCell(),
            forward_amount: 1,
            forward_payload: "Happy-Lottery WIN!".asComment().beginParse()
            }.toCell()
        });
        send(SendParameters {
            to: self.owner,
            value: 0,
            mode: SendRemainingBalance + SendIgnoreErrors,
            bounce: false
        });
    }

    receive(msg: RefundLottery) {
        require(now() >= self.deadline, "Lottery isn't expired yet");
        require(!self.isRefunded, "Lottery is already refunded");
        self.isRefunded = true;

        send(SendParameters{
            to: self.nft!!,
            value: ton("0.1"),
            bounce: true,
            body: Transfer{
                query_id: 0,   
                new_owner: self.creator!!,
                response_destination: self.owner,
                custom_payload: emptyCell(),
                forward_amount: 1,
                forward_payload: "Happy-Lottery refund".asComment().beginParse() 
            }.toCell()
        });

        let fee: Int = self.GAS_CONSUMPTION + self.nextBetId * ton("0.00003");

        let i: Int = 0;
        while(i < self.nextBetId) {
            let bet: Bet = self.bets.get(i)!!;
            send(SendParameters {
                to: bet.address,
                value: bet.amount / 100 * 95 - fee,
                mode: SendIgnoreErrors,
                bounce: false,
                body: "Happy-Lottery refund".asComment()
            });
            
            i = i + 1;
        }

        self.bets = emptyMap();  
        
        send(SendParameters {
            to: self.owner,
            value: 0,
            mode: SendRemainingBalance + SendIgnoreErrors,
            bounce: false
        });
    }

    receive(msg: GetNftBack) {
        require(self.nft != msg.nft_address, "You can't get NFT back if Lottery has started successfuly");
        send(SendParameters{
            to: msg.nft_address,
            value: context().value - self.GAS_CONSUMPTION,
            mode: SendIgnoreErrors,
            bounce: true,
            body: Transfer{
                query_id: 0,   
                new_owner: self.creator!!,
                response_destination: self.creator!!,
                custom_payload: emptyCell(),
                forward_amount: 1,
                forward_payload: "Happy-Lottery refund".asComment().beginParse()  
            }.toCell()
        });
    }

    receive(msg: OwnershipAssigned) {
        require(self.nft == null, "Contract already have NFT");
        self.nft = sender();
        self.deadline = now() + self.duration;
    }

    get fun get_info(): LotteryInfo {
        return LotteryInfo {
            id: self.id,
            isFinished: self.isFinished,
            isRefunded: self.isRefunded,
            creator_address: self.creator,
            winner_address: self.winner,
            total_bets: self.totalBets,
            goal_price: self.goalPrice,
            min_bet: self.minBet,
            nft_address: self.nft,
            duration: self.duration,
            deadline: self.deadline,
            participants_count: self.nextBetId
        };
    }
}
