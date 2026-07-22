# Contract designs — Land NFT, Magnolia City Fund, LiberCards checklist

Status: **design only — no deploys in this phase.**  
Chain: Arbitrum One. Tooling: Foundry (repo already uses solc 0.8.26).

**Never invent addresses.** Known token: SLETH `0x4064BFC0c404bE8F472bac81934714b2d2043869` (verify onchain before wiring).

---

## A. LiberCards deploy checklist (existing `contracts/game/LiberCards.sol`)

Already coded + Foundry tests. Before mainnet:

1. Freeze voucher signer key ops (EIP-712) — rotate runbook.
2. `forge script script/DeployLiberCards.s.sol` on Arbitrum with SLETH address verified.
3. Set `NEXT_PUBLIC_LIBER_CARDS_ADDRESS` on Vercel.
4. Wire DeckSelect to owned token IDs (catalog fallback for guests).
5. Metadata API already at `/api/game/cards/[id]/metadata` — point tokenURI.
6. External audit before promoting mint in UI for all users.
7. Monitor: mint volume, unmint refund correctness, treasury 10% path.

---

## B. `MagnoliaLand` (ERC-721)

### Intent

Sell plot NFTs representing Magnolia City districts. **All primary sale proceeds → MagnoliaCityFund.** Secondary royalties (e.g. 5%) also → fund.

### Sketch

```solidity
// Design sketch — not production code
contract MagnoliaLand is ERC721, Ownable {
    IERC20 public immutable sleth; // or ETH/USDC — pick one payment asset pre-audit
    IMagnoliaCityFund public immutable fund;
    uint256 public nextId;
    uint256 public mintPrice; // in payment token units
    uint256 public maxSupply;

    mapping(uint256 => bytes32) public plotKey; // district id / coords hash

    function mint(bytes32 plot, address to) external returns (uint256 tokenId);
    // pulls mintPrice from msg.sender → fund.deposit(payment, amount, "land_mint")
}
```

### Rules

- One plot key → one token (enforce uniqueness).
- Team/owner can batch-reserve plots for lore / quests (soulbound flag optional).
- No gameplay combat stats on land tokens.
- Metadata: map coordinates, district name, art URI (IPFS/Supabase storage).

### Open questions

- Payment asset: SLETH vs USDC vs ETH?
- Dutch auction vs fixed price waves?
- Max supply per district?

---

## C. `MagnoliaCityFund`

### Intent

Treasury that receives LiberCards treasury cut (optional forwarder), land sales, future fees. Redistributes to users **weighted by loyalty points** (LiberPass referrals + game loyalty), on epoch cadence.

### Sketch

```solidity
interface IMagnoliaCityFund {
    function deposit(address token, uint256 amount, bytes32 source) external;
    function epochLength() external view returns (uint256);
    function merkleRoot(uint256 epoch) external view returns (bytes32);
    function claim(uint256 epoch, uint256 amount, bytes32[] calldata proof) external;
}
```

### Offchain loyalty → onchain claims

1. Supabase (or LiberDapp) computes epoch scores: LiberPass active membership + referral points + game points.
2. Backend publishes Merkle root per epoch (token = SLETH or USDC).
3. Users claim with proof. Keep listing public for transparency.

### Safety

- Pausable, Ownable→timelock/multisig.
- No unbounded loops onchain for redistribution.
- Deposit tokens whitelisted.
- Epoch delay ≥ 7 days before root finalization.

### LiberPass tie-in

- New LiberPass purchase / referral confirmation already calls `add_points`.
- Fund epochs read the same points ledger — **do not** create a second loyalty balance.
- Narrative: “Magnolia grows when LiberPass grows; duelists with loyalty share the city fund.”

---

## D. Guild NFT (from `docs/ether-game/guilds.md`)

Out of scope for first land/fund pass, but must not conflict:

- Mint = 1 SLETH + tier × guild token.
- Signature attribute scales with tier.
- Still **one guild card per match**.

---

## E. Recommended build order (future audited phase)

1. Deploy LiberCards + NFT↔deck binding  
2. MagnoliaCityFund (deposit + merkle claim)  
3. MagnoliaLand mint → fund  
4. Forward LiberCards treasury 10% into fund (optional adapter)  
5. Guild NFTs  

Each step: Foundry tests, staging on Arbitrum Sepolia if used, then mainnet with multisig ownership.
