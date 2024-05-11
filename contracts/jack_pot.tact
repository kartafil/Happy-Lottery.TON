import "@stdlib/ownable";
import "./messages.tact";

contract JackPot with Ownable {
    const MIN_TON_FOR_STORAGE: Int = ton("0.03");
    const GAS_CONSUMPTION: Int = ton("0.035");

    id: Int as uint64;
    user: Address; // Адрес владельца 
    owner: Address; // Адрес JackPotMaster
    nft: Address;
    price: Int as coins = 0;
    nftReceived: Bool = false;
    timeOfNftReceived: Int as uint32 = 0;


    init(id: Int, user: Address, owner: Address) {
        self.id = id;
        self.user = user;
        self.owner = owner;
        self.nft = owner;
        //nativePrepareRandom();
    }

    fun requireCreator() {
        require(sender() == self.user, "Needs user");
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
            to: myAddress(),
            value: ctx.value - self.GAS_CONSUMPTION,
            mode: SendIgnoreErrors,
            bounce: true,
            body: Transfer{
                query_id: 0,   
                new_owner: ctx.sender,
                response_destination: ctx.sender,
                custom_payload: emptyCell(),
                forward_amount: 1,
                forward_payload: emptySlice() 
            }.toCell()
        });

        self.nft = msg.nft_address;
    }

    // bounced(src: Transfer) {
    //     dump("bounced");
    // }

    receive(msg: OwnershipAssigned) {
        self.nft = sender();
    }

    get fun get_nft_address(): Address {
        return self.nft;
    }
}
