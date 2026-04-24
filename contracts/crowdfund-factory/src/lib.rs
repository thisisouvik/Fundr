#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Address, BytesN, Env, IntoVal, Map, Symbol};

const CAMPAIGN_SEQ: Symbol = symbol_short!("CMP_SEQ");
const CAMPAIGNS: Symbol = symbol_short!("CMPS");
const WASM_HASH: Symbol = symbol_short!("WASM");

#[contract]
pub struct CrowdfundFactory;

#[contractimpl]
impl CrowdfundFactory {
    pub fn init(env: Env, wasm_hash: BytesN<32>) {
        if env.storage().instance().has(&WASM_HASH) {
            panic!("already initialized");
        }
        env.storage().instance().set(&WASM_HASH, &wasm_hash);
    }

    pub fn create_campaign(
        env: Env,
        creator: Address,
        token_address: Address,
        goal_xlm: i128,
        deadline_ts: u64,
    ) -> Address {
        // creator.require_auth() is removed because the platform backend
        // submits and signs this transaction on behalf of the user.

        if goal_xlm <= 0 {
            panic!("goal must be > 0");
        }

        let ledger_ts = env.ledger().timestamp();
        if deadline_ts <= ledger_ts {
            panic!("deadline must be in future");
        }

        let wasm_hash = env.storage().instance().get::<_, BytesN<32>>(&WASM_HASH).expect("not initialized");

        let mut seq = env.storage().instance().get::<_, u64>(&CAMPAIGN_SEQ).unwrap_or(0);
        seq += 1;
        env.storage().instance().set(&CAMPAIGN_SEQ, &seq);

        // Derive a salt for deployment (can use the sequence number)
        let salt = soroban_sdk::BytesN::from_array(&env, &[seq as u8; 32]);
        let campaign_id = env.deployer().with_current_contract(salt).deploy_v2(wasm_hash, ());

        // Invoke the init function on the new campaign contract
        env.invoke_contract::<()>(
            &campaign_id,
            &symbol_short!("init"),
            (creator.clone(), token_address, goal_xlm, deadline_ts).into_val(&env),
        );

        let mut campaigns = env
            .storage()
            .instance()
            .get::<_, Map<u64, Address>>(&CAMPAIGNS)
            .unwrap_or(Map::new(&env));

        campaigns.set(seq, campaign_id.clone());
        env.storage().instance().set(&CAMPAIGNS, &campaigns);

        campaign_id
    }

    pub fn get_campaign(env: Env, campaign_seq: u64) -> Option<Address> {
        let campaigns = env
            .storage()
            .instance()
            .get::<_, Map<u64, Address>>(&CAMPAIGNS)
            .unwrap_or(Map::new(&env));

        campaigns.get(campaign_seq)
    }
}
