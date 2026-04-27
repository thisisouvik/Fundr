#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, token, Address, Env, Map, Symbol};

const CREATOR: Symbol = symbol_short!("CREATOR");
const TOKEN: Symbol = symbol_short!("TOKEN");
const GOAL: Symbol = symbol_short!("GOAL");
const DEADLINE: Symbol = symbol_short!("DDLN");
const TOTAL_PLEDGED: Symbol = symbol_short!("PLEDGED");
const BALANCES: Symbol = symbol_short!("BALS");

#[contract]
pub struct Campaign;

#[contractimpl]
impl Campaign {
    pub fn init(env: Env, creator: Address, token_address: Address, goal_xlm: i128, deadline_ts: u64) {
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
        env.storage().instance().set(&BALANCES, &Map::<Address, i128>::new(&env));
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

        let mut pledged = env.storage().instance().get::<_, i128>(&TOTAL_PLEDGED).unwrap_or(0);
        pledged += amount_xlm;
        env.storage().instance().set(&TOTAL_PLEDGED, &pledged);

        let mut balances = env.storage().instance().get::<_, Map<Address, i128>>(&BALANCES).unwrap();
        let current_balance = balances.get(donor.clone()).unwrap_or(0);
        balances.set(donor.clone(), current_balance + amount_xlm);
        env.storage().instance().set(&BALANCES, &balances);

        pledged
    }

    pub fn withdraw(env: Env) {
        let creator = env.storage().instance().get::<_, Address>(&CREATOR).unwrap();
        creator.require_auth();

        let deadline_ts = env.storage().instance().get::<_, u64>(&DEADLINE).unwrap();
        if env.ledger().timestamp() <= deadline_ts {
            panic!("campaign still active");
        }

        let goal = env.storage().instance().get::<_, i128>(&GOAL).unwrap();
        let pledged = env.storage().instance().get::<_, i128>(&TOTAL_PLEDGED).unwrap_or(0);
        
        if pledged < goal {
            panic!("goal not met, cannot withdraw");
        }

        let token_id = env.storage().instance().get::<_, Address>(&TOKEN).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        let contract_balance = token_client.balance(&env.current_contract_address());

        if contract_balance > 0 {
            token_client.transfer(&env.current_contract_address(), &creator, &contract_balance);
        }
    }

    pub fn refund(env: Env, backer: Address) {
        let deadline_ts = env.storage().instance().get::<_, u64>(&DEADLINE).unwrap();
        if env.ledger().timestamp() <= deadline_ts {
            panic!("campaign still active");
        }

        let goal = env.storage().instance().get::<_, i128>(&GOAL).unwrap();
        let pledged = env.storage().instance().get::<_, i128>(&TOTAL_PLEDGED).unwrap_or(0);
        
        if pledged >= goal {
            panic!("goal was met, no refunds");
        }

        let mut balances = env.storage().instance().get::<_, Map<Address, i128>>(&BALANCES).unwrap();
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
        let creator = env.storage().instance().get::<_, Address>(&CREATOR).unwrap();
        let goal = env.storage().instance().get::<_, i128>(&GOAL).unwrap_or(0);
        let deadline = env.storage().instance().get::<_, u64>(&DEADLINE).unwrap_or(0);
        let pledged = env.storage().instance().get::<_, i128>(&TOTAL_PLEDGED).unwrap_or(0);

        (creator, goal, deadline, pledged)
    }
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

    fn create_token<'a>(env: &'a Env, admin: &Address) -> (Address, TokenClient<'a>, StellarAssetClient<'a>) {
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
        let (env, client, creator, backer, _token) = setup();

        // Pledge exactly the goal
        client.pledge(&backer, &1_000_0000000_i128);

        // Advance past deadline
        env.ledger().with_mut(|l| l.timestamp = 5_000);

        // Should not panic
        client.withdraw();

        // After withdrawal pledged count is unchanged in storage (tokens moved)
        let (_c, _g, _d, pledged) = client.get_state();
        assert_eq!(pledged, 1_000_0000000_i128);
        let _ = creator;
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
}
