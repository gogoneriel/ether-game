# Ether Game — DeFi Guild Cards (design)

Status: **design only** — not implemented onchain yet. Open for community debate.

## Goals

- Nine guilds inspired by major DeFi projects, each with a unique **guild NFT card**.
- Cards are **much stronger** than common Liber cards and limited to **one guild card per match**.
- **SLETH is neutral** — it is never a guild token. It is the universal mint base fee.
- Mint cost scales with a **tier (1×–10×)** paid in the guild’s own token; higher tiers unlock stronger signature stats.

## Mint formula

```
mint_cost = 1 SLETH  +  (tier × value_of_1_SLETH) in GUILD_TOKEN
tier ∈ {1, 2, …, 10}
```

- **Tier 1**: minimum — 1 SLETH + ~1 SLETH-equivalent of the guild token.
- **Tier 10**: maximum — 1 SLETH + ~10 SLETH-equivalent of the guild token.
- For each tier step above 1, the card’s **signature attribute** gains **+10%** (tier 10 ≈ +90% vs base).

Exact SLETH↔token equivalence (oracle vs fixed ratio) is an open question below.

## Match rule

A player may equip **at most one guild card** for a given match / session. Common (bronze/silver/gold) cards are unaffected by this rule.

## Chosen guild names (defaults)

| Project | Token | **Guild name** |
|---------|-------|----------------|
| Uniswap | UNI | **Legendary Unicorns** |
| EtherFi | ETHFI | **Ether Wardens** |
| Aave | AAVE | **Phantom Court** |
| Liquity | LQTY | **Tidecallers** |
| Synthetix | SNX | **Spartan Synths** |
| TrueFi | TRU | **The Trueborn** |
| Over | OVER | **Horizon Keepers** |
| Arbitrum | ARB | **Nitro Knights** |
| Rocket Pool | RPL | **The Rocketeers** |

### Name shortlist (alternatives)

- **Uniswap (UNI)**: Legendary Unicorns · The Hornguard · Unicorn Vanguard
- **EtherFi (ETHFI)**: Ether Wardens · The Restaked Order · Boundless Vault
- **Aave (AAVE)**: Phantom Court · Ghostlight Covenant · The Spectral Lenders
- **Liquity (LQTY)**: Tidecallers · The Liquid Legion · Zero-Fee Corsairs
- **Synthetix (SNX)**: Spartan Synths · The Synthforged · Oracle Spartans
- **TrueFi (TRU)**: The Trueborn · Oathkeepers · Creed of Trust
- **Over (OVER)**: Horizon Keepers · The Overworld Pioneers · Overlight Order
- **Arbitrum (ARB)**: Nitro Knights · Odyssey Vanguard · Nova Sentinels
- **Rocket Pool (RPL)**: The Rocketeers · Launch Brigade · Astral Poolers

## Suggested signature attributes (draft)

| Guild token | Signature attr (draft) | Flavor |
|-------------|------------------------|--------|
| UNI | MAGIA | Swaps / liquidity magic |
| ETHFI | DEF | Restake / shield |
| AAVE | DEF | Lending reserves |
| LQTY | ATK | Liquidation pressure |
| SNX | MAGIA | Synthetic oracle power |
| TRU | DEF | Credit / trust |
| OVER | ATK | Expansion / frontier |
| ARB | ATK | Nitro speed |
| RPL | MAGIA | Staking constellation |

## Open questions

1. **Price equivalence** — Chainlink (or similar) oracle vs a governance-fixed SLETH:token ratio refreshed periodically?
2. **Stake vs burn** — Are guild tokens locked in the NFT (refundable on burn/unmint) or burned / sent to a guild treasury?
3. **Tier upgrades** — Can a holder pay the difference to raise tier later, or is mint tier final?
4. **One-per-guild ownership** — Max one guild NFT per address per guild, or unlimited copies with tier variance?
5. **Battle timing** — Guild cards are design-complete before a battle mode exists; which attributes matter first for PvE vs PvP?
6. **Chain** — Arbitrum (where SLETH lives) with bridged guild tokens; which addresses are canonical?

## Out of scope (for now)

- Smart contract deployment
- Battle / deck gameplay loop
- LiberWallet mint UI wiring

## Related

- Common card economy (1 SLETH mint, rarity odds) remains separate and **neutral**.
- This document lives in the public Ether Game repo so the community can iterate before LiberWallet ships an adapter.
