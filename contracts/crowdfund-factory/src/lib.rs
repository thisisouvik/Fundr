#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Map, Symbol};

const CAMPAIGN_SEQ: Symbol = symbol_short!("CMP_SEQ");
const CAMPAIGNS: Symbol = symbol_short!("CMPS");

#[contract]
pub struct CrowdfundFactory;

#[contractimpl]
impl CrowdfundFactory {
    pub fn create_campaign(env: Env, creator: Address, goal_xlm: i128, deadline_ts: u64) -> u64 {
        creator.require_auth();

        if goal_xlm <= 0 {
            panic!("goal must be > 0");
        }

        let ledger_ts = env.ledger().timestamp();
        if deadline_ts <= ledger_ts {
            panic!("deadline must be in future");
        }

        let mut seq = env.storage().instance().get::<_, u64>(&CAMPAIGN_SEQ).unwrap_or(0);
        seq += 1;

        let mut campaigns = env
            .storage()
            .instance()
            .get::<_, Map<u64, (Address, i128, u64)>>(&CAMPAIGNS)
            .unwrap_or(Map::new(&env));

        campaigns.set(seq, (creator, goal_xlm, deadline_ts));

        env.storage().instance().set(&CAMPAIGN_SEQ, &seq);
        env.storage().instance().set(&CAMPAIGNS, &campaigns);

        seq
    }

    pub fn get_campaign_meta(env: Env, campaign_id: u64) -> Option<(Address, i128, u64)> {
        let campaigns = env
            .storage()
            .instance()
            .get::<_, Map<u64, (Address, i128, u64)>>(&CAMPAIGNS)
            .unwrap_or(Map::new(&env));

        campaigns.get(campaign_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};

    #[test]
    fn create_campaign_increments_sequence_and_stores_meta() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|li| {
            li.timestamp = 1_700_000_000;
        });

        let creator = Address::generate(&env);
        let contract_id = env.register(CrowdfundFactory, ());
        let client = CrowdfundFactoryClient::new(&env, &contract_id);

        let id1 = client.create_campaign(&creator, &1_000_i128, &1_700_000_100_u64);
        let id2 = client.create_campaign(&creator, &2_000_i128, &1_700_000_200_u64);

        assert_eq!(id1, 1_u64);
        assert_eq!(id2, 2_u64);

        let meta = client.get_campaign_meta(&id2).unwrap();
        assert_eq!(meta.0, creator);
        assert_eq!(meta.1, 2_000_i128);
        assert_eq!(meta.2, 1_700_000_200_u64);
    }

    #[test]
    #[should_panic(expected = "goal must be > 0")]
    fn create_campaign_rejects_non_positive_goal() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|li| {
            li.timestamp = 1_700_000_000;
        });

        let creator = Address::generate(&env);
        let contract_id = env.register(CrowdfundFactory, ());
        let client = CrowdfundFactoryClient::new(&env, &contract_id);

        client.create_campaign(&creator, &0_i128, &1_700_000_100_u64);
    }
}
