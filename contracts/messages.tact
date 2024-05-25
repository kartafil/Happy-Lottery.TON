struct Bet {
    address: Address;
    amount: Int as coins;
}

struct LotteryInfo {
    id: Int as uint64;
    isFinished: Bool;
    isRefunded: Bool;
    creator_address: Address?;
    winner_address: Address?;
    goal_price: Int as coins;
    total_bets: Int as coins;
    min_bet: Int as coins;
    nft_address: Address?;
    duration: Int as uint32;
    deadline: Int as uint32;
    participants_count: Int as uint32;
}

message CreateLottery {
    query_id: Int as uint64;
    creator_address: Address?;
    goal_price: Int as coins;
    min_bet: Int as coins;
    duration: Int as uint32;
}

message GetNftBack {
    query_id: Int as uint64;
    nft_address: Address;
}

message CalcWinner {
    query_id: Int as uint64;
}

message FinishLottery {
    query_id: Int as uint64;
}

message RefundLottery{
    query_id: Int as uint64;
}

///////// NFT ////////

message(0x693d3950) GetRoyaltyParams {
    query_id: Int as uint64;
}

message(0xa8cb00ad) ReportRoyaltyParams {
    query_id: Int as uint64;
    numerator:  Int as uint16;
    denominator: Int as uint16;
    destination: Address;
}

message(0x5fcc3d14) Transfer { 
    query_id: Int as uint64;            
    new_owner: Address; 
    response_destination: Address; 
    custom_payload: Cell?; 
    forward_amount: Int as coins;
    forward_payload: Slice as remaining;
}

message(0x05138d91) OwnershipAssigned{
    query_id: Int as uint64;
    prev_owner: Address;
    forward_payload: Slice as remaining; 
}

message(0xd53276db) Excesses {
    query_id: Int as uint64;
}

message(0x2fcb26a2) GetStaticData { 
    query_id: Int as uint64;
}

message(0x8b771735) ReportStaticData{
    query_id: Int as uint64;
    index_id: Int;
    collection: Address;
}

message Mint {
    query_id: Int as uint64;
}

message BatchMint {
    query_id: Int as uint64;
    size: Int as uint8;
    items: map<Int, Cell>;
}

message SetCollectionMetaData {
    query_id: Int as uint64;
    new_collection_content: Cell;
}

struct CollectionData {
    next_item_index: Int;
    collection_content: Cell;
    owner_address: Address;
}

struct RoyaltyParams {
    numerator: Int;
    denominator: Int;
    destination: Address;
}

struct GetNftData { 
    is_initialized: Bool;
    index: Int;
    collection_address: Address; 
    owner_address: Address;
    individual_content: Cell;
}