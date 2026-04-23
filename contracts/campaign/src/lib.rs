#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Symbol};

const CREATOR: Symbol = symbol_short!("CREATOR");
const GOAL: Symbol = symbol_short!("GOAL");
const DEADLINE: Symbol = symbol_short!("DDLN");
const TOTAL_PLEDGED: Symbol = symbol_short!("PLEDGED");

#[contract]
pub struct Campaign;

#[contractimpl]
impl Campaign {
    pub fn init(env: Env, creator: Address, goal_xlm: i128, deadline_ts: u64) {
        creator.require_auth();

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
        env.storage().instance().set(&GOAL, &goal_xlm);
        env.storage().instance().set(&DEADLINE, &deadline_ts);
        env.storage().instance().set(&TOTAL_PLEDGED, &0_i128);
    }

    pub fn pledge(env: Env, donor: Address, amount_xlm: i128) -> i128 {
        donor.require_auth();

        if amount_xlm <= 0 {
            panic!("pledge must be > 0");
        }

        let deadline_ts = env
            .storage()
            .instance()
            .get::<_, u64>(&DEADLINE)
            .unwrap_or(0);
        if env.ledger().timestamp() > deadline_ts {
            panic!("campaign closed");
        }

        let pledged = env
            .storage()
            .instance()
            .get::<_, i128>(&TOTAL_PLEDGED)
            .unwrap_or(0)
            + amount_xlm;

        env.storage().instance().set(&TOTAL_PLEDGED, &pledged);
        pledged
    }

    pub fn get_state(env: Env) -> (Address, i128, u64, i128) {
        let creator = env
            .storage()
            .instance()
            .get::<_, Address>(&CREATOR)
            .unwrap();
        let goal = env.storage().instance().get::<_, i128>(&GOAL).unwrap_or(0);
        let deadline = env.storage().instance().get::<_, u64>(&DEADLINE).unwrap_or(0);
        let pledged = env
            .storage()
            .instance()
            .get::<_, i128>(&TOTAL_PLEDGED)
            .unwrap_or(0);

        (creator, goal, deadline, pledged)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};

    #[test]
    fn init_and_pledge_updates_state() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|li| {
            li.timestamp = 1_700_000_000;
        });

        let creator = Address::generate(&env);
        let donor = Address::generate(&env);
        let contract_id = env.register(Campaign, ());
        let client = CampaignClient::new(&env, &contract_id);

        client.init(&creator, &1_000_i128, &1_700_000_100_u64);
        let pledged = client.pledge(&donor, &250_i128);

        assert_eq!(pledged, 250_i128);

        let state = client.get_state();
        assert_eq!(state.0, creator);
        assert_eq!(state.1, 1_000_i128);
        assert_eq!(state.2, 1_700_000_100_u64);
        assert_eq!(state.3, 250_i128);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn init_can_only_run_once() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|li| {
            li.timestamp = 1_700_000_000;
        });

        let creator = Address::generate(&env);
        let contract_id = env.register(Campaign, ());
        let client = CampaignClient::new(&env, &contract_id);

        client.init(&creator, &1_000_i128, &1_700_000_100_u64);
        client.init(&creator, &2_000_i128, &1_700_000_200_u64);
    }

    #[test]
    #[should_panic(expected = "campaign closed")]
    fn pledge_rejects_after_deadline() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|li| {
            li.timestamp = 1_700_000_000;
        });

        let creator = Address::generate(&env);
        let donor = Address::generate(&env);
        let contract_id = env.register(Campaign, ());
        let client = CampaignClient::new(&env, &contract_id);
        client.init(&creator, &1_000_i128, &1_700_000_050_u64);

        env.ledger().with_mut(|li| {
            li.timestamp = 1_700_000_200;
        });
        client.pledge(&donor, &100_i128);
    }
}
