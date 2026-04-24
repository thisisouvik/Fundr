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
