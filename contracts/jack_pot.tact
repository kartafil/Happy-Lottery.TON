import "@stdlib/deploy";
import "@stdlib/ownable";
import "./messages.tact";

contract JackPot with Deployable, Ownable {
    const MIN_TON_FOR_STORAGE: Int = ton("0.1");
    const GAS_CONSUMPTION: Int = ton("0.03");

    id: Int as uint64;
    creator: Address; // Адрес владельца 
    owner: Address; // Адрес JackPotMaster
    nft: Address;
    price: Int as coins = 0;
    nftReceived: Bool = false;
    timeOfNftReceived: Int as uint32 = 0;


    init(id: Int, creator: Address, owner: Address) {
        self.id = id;
        self.creator = creator;
        self.owner = owner;
        self.nft = owner;
        //nativePrepareRandom();
    }

    fun requireCreator() {
        require(sender() == self.creator, "Needs creator");
    }

    receive(msg: GetNftBack) {
        send(SendParameters{
            to: msg.nft_address,
            value: context().value - self.GAS_CONSUMPTION,
            mode: 0,
            bounce: true,
            body: Transfer{
                query_id: 0,   
                new_owner: self.creator,
                response_destination: self.creator,
                custom_payload: emptyCell(),
                forward_amount: 1,
                forward_payload: emptySlice() 
            }.toCell()
        });
    }

    // receive(msg: CheckNftOwnership) {   
    //     let ctx: Context = context();

    //     send(SendParameters{
    //         to: myAddress(),
    //         value: ctx.value - self.GAS_CONSUMPTION,
    //         mode: SendIgnoreErrors,
    //         bounce: true,
    //         body: Transfer{
    //             query_id: 0,   
    //             new_owner: ctx.sender,
    //             response_destination: ctx.sender,
    //             custom_payload: emptyCell(),
    //             forward_amount: 1,
    //             forward_payload: emptySlice() 
    //         }.toCell()
    //     });
    // }

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
