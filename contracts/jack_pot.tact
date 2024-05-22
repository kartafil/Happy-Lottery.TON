import "./messages.tact";

contract JackPot {
    const MIN_TON_FOR_STORAGE: Int = ton("0.05");
    const GAS_CONSUMPTION: Int = ton("0.035");

    user: Address? = null; // Адрес владельца 
    owner: Address; // Адрес JackPotMaster
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

    init(
        id: Int,
        owner: Address,
        ) {
        self.id = id;
        self.owner = owner;
        self.bets = emptyMap();
    }

    fun finish() {
        let i: Int = 0;
        let amount: Int = 0;

        nativeRandomize(now() / myBalance() + self.nextBetId);
        let winNumber: Int = random(0, self.totalBets);

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
            mode: SendRemainingBalance + SendIgnoreErrors,
            body: FinishJackPot{
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
            body: RefundJackPot{
                query_id: 0
            }.toCell(),
            bounce: true
        });
    }

    receive(msg: CreateJackPot) {
        require(self.user == null, "JackPot already created");
        require(msg.min_bet >= ton("0.2"), "Minimal bet is less than 0.2 ton");
        require(msg.duration < 604800, "Maximal duration is 7 days");
        self.duration = msg.duration;
        self.goalPrice = msg.goal_price;
        self.minBet = msg.min_bet;
        self.user = msg.user_address;

        let ctx: Context = context();
    
        let msgValue: Int = ctx.value; // Check the gasCost for storage
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
        let storageFee: Int = self.MIN_TON_FOR_STORAGE - min(tonBalanceBeforeMsg, self.MIN_TON_FOR_STORAGE);
        msgValue = msgValue - (storageFee + self.GAS_CONSUMPTION);

        require(msgValue > 0, "invalid amount");

        send(SendParameters{
                to: self.user!!,
                value: msgValue,
                mode:  SendIgnoreErrors,
                body: Excesses { query_id: msg.query_id }.toCell() //0xd53276db
            });
    }

    receive("bet") {
        require(self.nft != null, "Contract doesn't have nft");
        require(!self.isFinished, "Jackpot is finished");
        if(self.totalBets >= self.goalPrice) {
            self.finish();
            return;
        }
        if (now() >= self.deadline) {
            self.refund();
            return;
        }

        let ctx: Context = context();
        require(ctx.value >= self.minBet, "Not enough TON to make bet");
        
        self.bets.set(self.nextBetId, Bet{ address: ctx.sender, amount: ctx.value });
        self.nextBetId = self.nextBetId + 1;

        self.totalBets = self.totalBets + ctx.value;
        if(self.totalBets >= self.goalPrice) {
            self.finish();
        }
    }

    receive(msg: FinishJackPot) {
        require(!self.isFinished, "JackPot is finished");
        self.isFinished = true;
        
        let amountForUser: Int = min(myBalance(), self.goalPrice) / 10 * 9 - self.GAS_CONSUMPTION * 2 - ton("0.1");
        send(SendParameters {
            to: self.user!!,
            value: amountForUser,
            mode: SendIgnoreErrors,
            body: "JackPot payment".asComment(),
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
            forward_payload: emptySlice() 
            }.toCell()
        });
        send(SendParameters {
            to: self.owner,
            value: 0,
            mode: SendRemainingBalance + SendIgnoreErrors,
            bounce: false
        });
    }

    receive(msg: RefundJackPot) {
        require(!self.isFinished, "JackPot is finished");
        self.isFinished = true;

        send(SendParameters{
            to: self.nft!!,
            value: ton("0.1"),
            bounce: true,
            body: Transfer{
                query_id: 0,   
                new_owner: self.user!!,
                response_destination: self.owner,
                custom_payload: emptyCell(),
                forward_amount: 1,
                forward_payload: emptySlice() 
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
                body: "JackPot refund".asComment()
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
        require(self.nft == null, "You can't get NFT back if JackPot has started successfuly");
        send(SendParameters{
            to: msg.nft_address,
            value: context().value - self.GAS_CONSUMPTION,
            mode: SendIgnoreErrors,
            bounce: true,
            body: Transfer{
                query_id: 0,   
                new_owner: self.user!!,
                response_destination: self.user!!,
                custom_payload: emptyCell(),
                forward_amount: 1,
                forward_payload: emptySlice() 
            }.toCell()
        });
    }

    receive(msg: OwnershipAssigned) {
        require(self.nft == null, "Contract already have NFT");
        self.nft = sender();
        self.deadline = now() + self.duration;
    }

    get fun get_info(): JackPotInfo {
        return JackPotInfo {
            id: self.id,
            isFinished: self.isFinished,
            creator_address: self.user,
            winner: self.winner,
            total_bets: self.totalBets,
            goal_price: self.goalPrice,
            min_bet: self.minBet,
            nft_address: self.nft,
            deadline: self.deadline
        };
    }
}
