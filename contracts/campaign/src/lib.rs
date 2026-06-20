#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, token, Address, Env, Map, Symbol};

const CREATOR: Symbol = symbol_short!("CREATOR");
const TOKEN: Symbol = symbol_short!("TOKEN");
const GOAL: Symbol = symbol_short!("GOAL");
const DEADLINE: Symbol = symbol_short!("DDLN");
const TOTAL_PLEDGED: Symbol = symbol_short!("PLEDGED");
const BALANCES: Symbol = symbol_short!("BALS");
const FIRST_RELEASED: Symbol = symbol_short!("TR1REL");
const MILESTONE_1_COMPLETED: Symbol = symbol_short!("M1DONE");
const MILESTONE_2_COMPLETED: Symbol = symbol_short!("M2DONE");
const MILESTONE_1_YES: Symbol = symbol_short!("M1YES");
const MILESTONE_2_YES: Symbol = symbol_short!("M2YES");
const MILESTONE_1_VOTES: Symbol = symbol_short!("M1VOTES");
const MILESTONE_2_VOTES: Symbol = symbol_short!("M2VOTES");

const FIRST_TRANCHE_PERCENT: i128 = 30;
const SECOND_TRANCHE_PERCENT: i128 = 35;
const APPROVAL_PERCENT: i128 = 50;

#[contract]
pub struct Campaign;

#[contractimpl]
impl Campaign {
    pub fn init(
        env: Env,
        creator: Address,
        token_address: Address,
        goal_xlm: i128,
        deadline_ts: u64,
    ) {
        if env.storage().instance().has(&CREATOR) {
            panic!("already initialized");
        }

        if goal_xlm <= 0 {
            panic!("goal must be > 0");
        }

        if deadline_ts <= env.ledger().timestamp() {
            panic!("deadline must be in future");
        }

        env.storage().instance().set(&CREATOR, &creator);
        env.storage().instance().set(&TOKEN, &token_address);
        env.storage().instance().set(&GOAL, &goal_xlm);
        env.storage().instance().set(&DEADLINE, &deadline_ts);
        env.storage().instance().set(&TOTAL_PLEDGED, &0_i128);
        env.storage()
            .instance()
            .set(&BALANCES, &Map::<Address, i128>::new(&env));
        env.storage().instance().set(&FIRST_RELEASED, &false);
        env.storage().instance().set(&MILESTONE_1_COMPLETED, &false);
        env.storage().instance().set(&MILESTONE_2_COMPLETED, &false);
        env.storage().instance().set(&MILESTONE_1_YES, &0_i128);
        env.storage().instance().set(&MILESTONE_2_YES, &0_i128);
        env.storage()
            .instance()
            .set(&MILESTONE_1_VOTES, &Map::<Address, bool>::new(&env));
        env.storage()
            .instance()
            .set(&MILESTONE_2_VOTES, &Map::<Address, bool>::new(&env));
    }

    pub fn pledge(env: Env, donor: Address, amount_xlm: i128) -> i128 {
        donor.require_auth();

        if amount_xlm <= 0 {
            panic!("pledge must be > 0");
        }

        let deadline_ts = env.storage().instance().get::<_, u64>(&DEADLINE).unwrap();
        if env.ledger().timestamp() > deadline_ts {
            panic!("campaign closed");
        }

        let token_id = env.storage().instance().get::<_, Address>(&TOKEN).unwrap();
        let token_client = token::Client::new(&env, &token_id);

        // Transfer XLM from donor to this contract
        token_client.transfer(&donor, &env.current_contract_address(), &amount_xlm);

        let mut pledged = env
            .storage()
            .instance()
            .get::<_, i128>(&TOTAL_PLEDGED)
            .unwrap_or(0);
        pledged += amount_xlm;
        env.storage().instance().set(&TOTAL_PLEDGED, &pledged);

        let mut balances = env
            .storage()
            .instance()
            .get::<_, Map<Address, i128>>(&BALANCES)
            .unwrap();
        let current_balance = balances.get(donor.clone()).unwrap_or(0);
        balances.set(donor.clone(), current_balance + amount_xlm);
        env.storage().instance().set(&BALANCES, &balances);

        pledged
    }

    pub fn withdraw(env: Env) -> i128 {
        let creator = env
            .storage()
            .instance()
            .get::<_, Address>(&CREATOR)
            .unwrap();
        creator.require_auth();

        assert_campaign_successful(&env);

        let first_released = env
            .storage()
            .instance()
            .get::<_, bool>(&FIRST_RELEASED)
            .unwrap_or(false);
        if first_released {
            panic!("first tranche already released");
        }

        let pledged = env
            .storage()
            .instance()
            .get::<_, i128>(&TOTAL_PLEDGED)
            .unwrap_or(0);
        let amount = release_percent(&env, FIRST_TRANCHE_PERCENT, pledged);
        env.storage().instance().set(&FIRST_RELEASED, &true);

        amount
    }

    pub fn vote_milestone(env: Env, backer: Address, milestone: u32, approve: bool) -> i128 {
        backer.require_auth();
        assert_campaign_successful(&env);

        let balances = env
            .storage()
            .instance()
            .get::<_, Map<Address, i128>>(&BALANCES)
            .unwrap();
        let vote_weight = balances.get(backer.clone()).unwrap_or(0);
        if vote_weight <= 0 {
            panic!("only backers can vote");
        }

        let (votes_key, yes_key, completed_key) = milestone_keys(milestone);
        let completed = env
            .storage()
            .instance()
            .get::<_, bool>(&completed_key)
            .unwrap_or(false);
        if completed {
            panic!("milestone already completed");
        }

        let mut votes = env
            .storage()
            .instance()
            .get::<_, Map<Address, bool>>(&votes_key)
            .unwrap();
        if votes.get(backer.clone()).unwrap_or(false) {
            panic!("backer already voted");
        }

        votes.set(backer, true);
        env.storage().instance().set(&votes_key, &votes);

        let mut yes_votes = env
            .storage()
            .instance()
            .get::<_, i128>(&yes_key)
            .unwrap_or(0);
        if approve {
            yes_votes += vote_weight;
            env.storage().instance().set(&yes_key, &yes_votes);
        }

        yes_votes
    }

    pub fn release_milestone_funds(env: Env) -> i128 {
        let creator = env
            .storage()
            .instance()
            .get::<_, Address>(&CREATOR)
            .unwrap();
        creator.require_auth();
        assert_campaign_successful(&env);

        let pledged = env
            .storage()
            .instance()
            .get::<_, i128>(&TOTAL_PLEDGED)
            .unwrap_or(0);

        let first_released = env
            .storage()
            .instance()
            .get::<_, bool>(&FIRST_RELEASED)
            .unwrap_or(false);
        if !first_released {
            let amount = release_percent(&env, FIRST_TRANCHE_PERCENT, pledged);
            env.storage().instance().set(&FIRST_RELEASED, &true);
            return amount;
        }

        let milestone_1_completed = env
            .storage()
            .instance()
            .get::<_, bool>(&MILESTONE_1_COMPLETED)
            .unwrap_or(false);
        if !milestone_1_completed {
            assert_milestone_approved(&env, MILESTONE_1_YES, pledged);
            let amount = release_percent(&env, SECOND_TRANCHE_PERCENT, pledged);
            env.storage().instance().set(&MILESTONE_1_COMPLETED, &true);
            return amount;
        }

        let milestone_2_completed = env
            .storage()
            .instance()
            .get::<_, bool>(&MILESTONE_2_COMPLETED)
            .unwrap_or(false);
        if !milestone_2_completed {
            assert_milestone_approved(&env, MILESTONE_2_YES, pledged);
            let amount = release_remaining(&env);
            env.storage().instance().set(&MILESTONE_2_COMPLETED, &true);
            return amount;
        }

        panic!("all milestone funds released");
    }

    pub fn refund(env: Env, backer: Address) {
        let deadline_ts = env.storage().instance().get::<_, u64>(&DEADLINE).unwrap();
        if env.ledger().timestamp() <= deadline_ts {
            panic!("campaign still active");
        }

        let goal = env.storage().instance().get::<_, i128>(&GOAL).unwrap();
        let pledged = env
            .storage()
            .instance()
            .get::<_, i128>(&TOTAL_PLEDGED)
            .unwrap_or(0);

        if pledged >= goal {
            panic!("goal was met, no refunds");
        }

        let mut balances = env
            .storage()
            .instance()
            .get::<_, Map<Address, i128>>(&BALANCES)
            .unwrap();
        let amount = balances.get(backer.clone()).unwrap_or(0);

        if amount > 0 {
            let token_id = env.storage().instance().get::<_, Address>(&TOKEN).unwrap();
            let token_client = token::Client::new(&env, &token_id);

            // Deduct before transferring to prevent re-entrancy
            balances.set(backer.clone(), 0);
            env.storage().instance().set(&BALANCES, &balances);

            token_client.transfer(&env.current_contract_address(), &backer, &amount);
        }
    }

    pub fn get_state(env: Env) -> (Address, i128, u64, i128) {
        let creator = env
            .storage()
            .instance()
            .get::<_, Address>(&CREATOR)
            .unwrap();
        let goal = env.storage().instance().get::<_, i128>(&GOAL).unwrap_or(0);
        let deadline = env
            .storage()
            .instance()
            .get::<_, u64>(&DEADLINE)
            .unwrap_or(0);
        let pledged = env
            .storage()
            .instance()
            .get::<_, i128>(&TOTAL_PLEDGED)
            .unwrap_or(0);

        (creator, goal, deadline, pledged)
    }

    pub fn get_milestone_state(env: Env) -> (bool, bool, bool, i128, i128) {
        let first_released = env
            .storage()
            .instance()
            .get::<_, bool>(&FIRST_RELEASED)
            .unwrap_or(false);
        let milestone_1_completed = env
            .storage()
            .instance()
            .get::<_, bool>(&MILESTONE_1_COMPLETED)
            .unwrap_or(false);
        let milestone_2_completed = env
            .storage()
            .instance()
            .get::<_, bool>(&MILESTONE_2_COMPLETED)
            .unwrap_or(false);
        let milestone_1_yes = env
            .storage()
            .instance()
            .get::<_, i128>(&MILESTONE_1_YES)
            .unwrap_or(0);
        let milestone_2_yes = env
            .storage()
            .instance()
            .get::<_, i128>(&MILESTONE_2_YES)
            .unwrap_or(0);

        (
            first_released,
            milestone_1_completed,
            milestone_2_completed,
            milestone_1_yes,
            milestone_2_yes,
        )
    }
}

fn assert_campaign_successful(env: &Env) {
    let deadline_ts = env.storage().instance().get::<_, u64>(&DEADLINE).unwrap();
    if env.ledger().timestamp() <= deadline_ts {
        panic!("campaign still active");
    }

    let goal = env.storage().instance().get::<_, i128>(&GOAL).unwrap();
    let pledged = env
        .storage()
        .instance()
        .get::<_, i128>(&TOTAL_PLEDGED)
        .unwrap_or(0);
    if pledged < goal {
        panic!("goal not met, cannot withdraw");
    }
}

fn assert_milestone_approved(env: &Env, yes_key: Symbol, pledged: i128) {
    let yes_votes = env
        .storage()
        .instance()
        .get::<_, i128>(&yes_key)
        .unwrap_or(0);
    if yes_votes * 100 < pledged * APPROVAL_PERCENT {
        panic!("milestone not approved");
    }
}

fn milestone_keys(milestone: u32) -> (Symbol, Symbol, Symbol) {
    if milestone == 1 {
        (MILESTONE_1_VOTES, MILESTONE_1_YES, MILESTONE_1_COMPLETED)
    } else if milestone == 2 {
        (MILESTONE_2_VOTES, MILESTONE_2_YES, MILESTONE_2_COMPLETED)
    } else {
        panic!("invalid milestone");
    }
}

fn release_percent(env: &Env, percent: i128, pledged: i128) -> i128 {
    let tranche_amount = pledged * percent / 100;
    release_amount(env, tranche_amount)
}

fn release_remaining(env: &Env) -> i128 {
    let token_id = env.storage().instance().get::<_, Address>(&TOKEN).unwrap();
    let token_client = token::Client::new(env, &token_id);
    let contract_balance = token_client.balance(&env.current_contract_address());
    release_amount(env, contract_balance)
}

fn release_amount(env: &Env, requested_amount: i128) -> i128 {
    let creator = env
        .storage()
        .instance()
        .get::<_, Address>(&CREATOR)
        .unwrap();
    let token_id = env.storage().instance().get::<_, Address>(&TOKEN).unwrap();
    let token_client = token::Client::new(env, &token_id);
    let contract_balance = token_client.balance(&env.current_contract_address());
    let amount = if requested_amount > contract_balance {
        contract_balance
    } else {
        requested_amount
    };

    if amount > 0 {
        token_client.transfer(&env.current_contract_address(), &creator, &amount);
    }

    amount
}

// ─────────────────────────────────────────────────────────────
// Unit tests
// ─────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        token::{Client as TokenClient, StellarAssetClient},
        Address, Env,
    };

    use super::{Campaign, CampaignClient};

    // ── Helpers ──────────────────────────────────────────────

    fn create_token<'a>(
        env: &'a Env,
        admin: &Address,
    ) -> (Address, TokenClient<'a>, StellarAssetClient<'a>) {
        let contract_id = env.register_stellar_asset_contract_v2(admin.clone());
        let address = contract_id.address();
        let token = TokenClient::new(env, &address);
        let asset = StellarAssetClient::new(env, &address);
        (address, token, asset)
    }

    fn setup() -> (Env, CampaignClient<'static>, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let backer = Address::generate(&env);
        let admin = Address::generate(&env);

        let (token_addr, _token, asset) = create_token(&env, &admin);

        // Mint tokens to backer
        asset.mint(&backer, &10_000_0000000_i128); // 10 000 XLM (7 decimals)

        let campaign_id = env.register(Campaign, ());
        let client = CampaignClient::new(&env, &campaign_id);

        // Set ledger timestamp to 1_000
        env.ledger().with_mut(|l| l.timestamp = 1_000);

        // Deadline = now + 3 600 (1 hour ahead)
        client.init(&creator, &token_addr, &1_000_0000000_i128, &4_600);

        (env, client, creator, backer, token_addr)
    }

    // ── Test 1: Successful init and get_state ─────────────────

    #[test]
    fn test_init_and_get_state() {
        let (env, client, creator, _backer, _token) = setup();
        let (state_creator, goal, deadline, pledged) = client.get_state();
        assert_eq!(state_creator, creator);
        assert_eq!(goal, 1_000_0000000_i128);
        assert_eq!(deadline, 4_600_u64);
        assert_eq!(pledged, 0_i128);
        let _ = env;
    }

    // ── Test 2: Pledge succeeds within deadline ───────────────

    #[test]
    fn test_pledge_success() {
        let (env, client, _creator, backer, _token) = setup();

        // still within deadline (ledger = 1_000, deadline = 4_600)
        let total = client.pledge(&backer, &500_0000000_i128);
        assert_eq!(total, 500_0000000_i128);

        let (_c, _g, _d, pledged) = client.get_state();
        assert_eq!(pledged, 500_0000000_i128);
        let _ = env;
    }

    // ── Test 3: Pledge fails after deadline ───────────────────

    #[test]
    #[should_panic(expected = "campaign closed")]
    fn test_pledge_after_deadline_panics() {
        let (env, client, _creator, backer, _token) = setup();

        // Advance ledger past deadline
        env.ledger().with_mut(|l| l.timestamp = 5_000);
        client.pledge(&backer, &100_0000000_i128);
    }

    // ── Test 4: Withdraw succeeds after deadline + goal met ───

    #[test]
    fn test_withdraw_success() {
        let (env, client, creator, backer, token_addr) = setup();

        // Pledge exactly the goal
        client.pledge(&backer, &1_000_0000000_i128);

        // Advance past deadline
        env.ledger().with_mut(|l| l.timestamp = 5_000);

        let token = TokenClient::new(&env, &token_addr);
        let creator_before = token.balance(&creator);
        let released = client.withdraw();
        let creator_after = token.balance(&creator);

        assert_eq!(released, 300_0000000_i128);
        assert_eq!(creator_after - creator_before, 300_0000000_i128);
        let (_c, _g, _d, pledged) = client.get_state();
        assert_eq!(pledged, 1_000_0000000_i128);

        let (first_released, milestone_1_completed, milestone_2_completed, m1_yes, m2_yes) =
            client.get_milestone_state();
        assert!(first_released);
        assert!(!milestone_1_completed);
        assert!(!milestone_2_completed);
        assert_eq!(m1_yes, 0_i128);
        assert_eq!(m2_yes, 0_i128);
    }

    // ── Test 5: Withdraw fails before deadline ────────────────

    #[test]
    #[should_panic(expected = "campaign still active")]
    fn test_withdraw_before_deadline_panics() {
        let (env, client, _creator, backer, _token) = setup();

        client.pledge(&backer, &1_000_0000000_i128);
        // Ledger is still at 1_000, before deadline 4_600
        client.withdraw();
        let _ = env;
    }

    // ── Test 6: Withdraw fails if goal not met ────────────────

    #[test]
    #[should_panic(expected = "goal not met, cannot withdraw")]
    fn test_withdraw_goal_not_met_panics() {
        let (env, client, _creator, backer, _token) = setup();

        // Pledge below goal
        client.pledge(&backer, &100_0000000_i128);

        env.ledger().with_mut(|l| l.timestamp = 5_000);
        client.withdraw();
    }

    // ── Test 7: Refund succeeds when goal not met ─────────────

    #[test]
    fn test_refund_success() {
        let (env, client, _creator, backer, token_addr) = setup();

        client.pledge(&backer, &100_0000000_i128);

        env.ledger().with_mut(|l| l.timestamp = 5_000);

        let token = TokenClient::new(&env, &token_addr);
        let balance_before = token.balance(&backer);

        client.refund(&backer);

        let balance_after = token.balance(&backer);
        assert_eq!(balance_after - balance_before, 100_0000000_i128);
    }

    // ── Test 8: Refund fails when goal was met ────────────────

    #[test]
    #[should_panic(expected = "goal was met, no refunds")]
    fn test_refund_after_goal_met_panics() {
        let (env, client, _creator, backer, _token) = setup();

        client.pledge(&backer, &1_000_0000000_i128);
        env.ledger().with_mut(|l| l.timestamp = 5_000);

        client.refund(&backer);
    }

    // ── Test 9: Double-init panics ────────────────────────────

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_init_panics() {
        let (env, client, creator, _backer, token_addr) = setup();
        // Re-initialise same contract
        client.init(&creator, &token_addr, &500_0000000_i128, &9_000);
        let _ = env;
    }

    // ── Test 10: Zero-goal init panics ────────────────────────

    #[test]
    #[should_panic(expected = "goal must be > 0")]
    fn test_zero_goal_panics() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|l| l.timestamp = 1_000);

        let creator = Address::generate(&env);
        let admin = Address::generate(&env);
        let (token_addr, _token, _asset) = {
            let c = env.register_stellar_asset_contract_v2(admin.clone());
            let addr = c.address();
            let tok = soroban_sdk::token::Client::new(&env, &addr);
            let ast = soroban_sdk::token::StellarAssetClient::new(&env, &addr);
            (addr, tok, ast)
        };

        let campaign_id = env.register(Campaign, ());
        let client = CampaignClient::new(&env, &campaign_id);

        client.init(&creator, &token_addr, &0_i128, &4_600);
    }

    #[test]
    fn test_milestone_votes_release_remaining_tranches() {
        let (env, client, creator, backer, token_addr) = setup();

        client.pledge(&backer, &1_000_0000000_i128);
        env.ledger().with_mut(|l| l.timestamp = 5_000);

        let token = TokenClient::new(&env, &token_addr);
        let creator_before = token.balance(&creator);

        assert_eq!(client.release_milestone_funds(), 300_0000000_i128);
        assert_eq!(
            client.vote_milestone(&backer, &1_u32, &true),
            1_000_0000000_i128
        );
        assert_eq!(client.release_milestone_funds(), 350_0000000_i128);
        assert_eq!(
            client.vote_milestone(&backer, &2_u32, &true),
            1_000_0000000_i128
        );
        assert_eq!(client.release_milestone_funds(), 350_0000000_i128);

        let creator_after = token.balance(&creator);
        assert_eq!(creator_after - creator_before, 1_000_0000000_i128);

        let (first_released, milestone_1_completed, milestone_2_completed, m1_yes, m2_yes) =
            client.get_milestone_state();
        assert!(first_released);
        assert!(milestone_1_completed);
        assert!(milestone_2_completed);
        assert_eq!(m1_yes, 1_000_0000000_i128);
        assert_eq!(m2_yes, 1_000_0000000_i128);
    }

    #[test]
    #[should_panic(expected = "milestone not approved")]
    fn test_second_tranche_requires_milestone_vote() {
        let (env, client, _creator, backer, _token) = setup();

        client.pledge(&backer, &1_000_0000000_i128);
        env.ledger().with_mut(|l| l.timestamp = 5_000);

        client.release_milestone_funds();
        client.release_milestone_funds();
    }

    #[test]
    #[should_panic(expected = "backer already voted")]
    fn test_backer_cannot_vote_twice_on_same_milestone() {
        let (env, client, _creator, backer, _token) = setup();

        client.pledge(&backer, &1_000_0000000_i128);
        env.ledger().with_mut(|l| l.timestamp = 5_000);

        client.vote_milestone(&backer, &1_u32, &true);
        client.vote_milestone(&backer, &1_u32, &true);
    }
}
