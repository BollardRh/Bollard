import {
  createPublicClient,
  createWalletClient,
  custom,
  decodeEventLog,
  defineChain,
  encodeFunctionData,
  http,
  keccak256,
  parseAbi,
  toHex,
  type Address,
  type EIP1193Provider,
  type Hex,
} from "viem";

/**
 * Browser wallet helpers for the dashboard's builder flow (bundled to dist/assets/wallet/wallet.mjs and
 * loaded only on the Builders view). Any EIP-1193 wallet works (MetaMask, Rabby, Coinbase Wallet, ...).
 */

// The only browser global used here; declared locally so the server code keeps its Node types.
declare const window: { ethereum?: EIP1193Provider };

export interface NetworkConfig {
  chainId: number;
  network: string;
  rpcUrl: string;
  explorer: string;
}

let net: NetworkConfig | undefined;
let account: Address | undefined;

const chainOf = (n: NetworkConfig) =>
  defineChain({
    id: n.chainId,
    name: n.network,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [n.rpcUrl] } },
    blockExplorers: n.explorer ? { default: { name: "Explorer", url: n.explorer } } : undefined,
  });

function provider(): EIP1193Provider {
  if (!window.ethereum) throw new Error("No browser wallet found. Install MetaMask or another EVM wallet.");
  return window.ethereum;
}

const pub = () => createPublicClient({ chain: chainOf(net!), transport: http(net!.rpcUrl) });
const wallet = () => createWalletClient({ chain: chainOf(net!), transport: custom(provider()), account: account! });

export function hasWallet(): boolean {
  return Boolean(window.ethereum);
}

/** Connects and makes sure the wallet is on the configured chain (adding it if the wallet does not know it). */
export async function connect(cfg: NetworkConfig): Promise<Address> {
  net = cfg;
  const p = provider();
  const [a] = (await p.request({ method: "eth_requestAccounts" })) as Address[];
  if (!a) throw new Error("The wallet returned no account.");
  account = a;
  const hexId = `0x${cfg.chainId.toString(16)}`;
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  } catch (e) {
    if ((e as { code?: number }).code !== 4902) throw e;
    await p.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: hexId,
          chainName: cfg.network,
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: [cfg.rpcUrl],
          blockExplorerUrls: cfg.explorer ? [cfg.explorer] : undefined,
        },
      ],
    });
  }
  return a;
}

export function connected(): Address | undefined {
  return account;
}

export async function balanceEth(): Promise<string> {
  const wei = await pub().getBalance({ address: account! });
  return (Number(wei) / 1e18).toFixed(5);
}

/** Sends a prepared call (from the API's requestCalldata) and waits for it. */
export async function send(tx: { to: Address; data: Hex }) {
  const hash = await wallet().sendTransaction({ to: tx.to, data: tx.data, chain: chainOf(net!) });
  const receipt = await pub().waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Transaction reverted: ${hash}`);
  return receipt;
}

export async function signMessage(message: string): Promise<Hex> {
  return wallet().signMessage({ message, account: account! });
}

/** EIP-712 typed data as the API's config() describes it; uint fields may be passed as decimal strings or numbers. */
export interface TypedDataRequest {
  domain: { name: string; version: string; chainId: number; verifyingContract: Address };
  types: Record<string, readonly { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
}

/** eth_signTypedData_v4 with the connected account. uint* fields are converted to bigint first. */
export async function signTypedData(req: TypedDataRequest): Promise<Hex> {
  const fields = req.types[req.primaryType];
  if (!fields) throw new Error(`Unknown typed-data type ${req.primaryType}`);
  const message: Record<string, unknown> = {};
  for (const f of fields) {
    const v = req.message[f.name];
    message[f.name] = /^uint\d*$/.test(f.type) ? BigInt(v as string | number | bigint) : v;
  }
  return wallet().signTypedData({
    account: account!,
    domain: req.domain,
    types: req.types as Record<string, { name: string; type: string }[]>,
    primaryType: req.primaryType,
    message,
  });
}

const runRequested = parseAbi([
  "event RunRequested(uint256 indexed requestId, address indexed agentRegistry, uint256 indexed agentId, bytes32 versionHash, address payer, uint256 fee)",
]);
const transfer721 = parseAbi(["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"]);

/** Reads the request id out of a requestRun receipt. */
export function requestIdFrom(receipt: { logs: { data: Hex; topics: Hex[] }[] }): string | undefined {
  for (const l of receipt.logs) {
    try {
      const d = decodeEventLog({ abi: runRequested, data: l.data, topics: l.topics as [Hex, ...Hex[]] });
      if (d.eventName === "RunRequested") return d.args.requestId.toString();
    } catch {
      /* other events */
    }
  }
  return undefined;
}

/** Registers a new ERC-8004 agent owned by the connected wallet; returns its id. */
export async function registerAgent(identity: Address, agentURI: string): Promise<string> {
  const data = encodeFunctionData({ abi: parseAbi(["function register(string agentURI) returns (uint256)"]), functionName: "register", args: [agentURI] });
  const receipt = await send({ to: identity, data });
  for (const l of receipt.logs) {
    try {
      const d = decodeEventLog({ abi: transfer721, data: l.data, topics: l.topics as [Hex, ...Hex[]] });
      if (d.eventName === "Transfer" && d.args.to.toLowerCase() === account!.toLowerCase()) return d.args.tokenId.toString();
    } catch {
      /* not a Transfer */
    }
  }
  throw new Error("Registered, but the new agent id was not found in the receipt.");
}

/** Testnet only: tUSDG has an open mint. */
export async function mintTestTokens(token: Address, amount: bigint) {
  const data = encodeFunctionData({ abi: parseAbi(["function mint(address to, uint256 amount)"]), functionName: "mint", args: [account!, amount] });
  return send({ to: token, data });
}

/** Testnet only: tBLRD for arena attempt burns (same open mint as tUSDG). */
export async function approve(token: Address, spender: Address, amount: bigint) {
  const data = encodeFunctionData({ abi: parseAbi(["function approve(address spender, uint256 amount) returns (bool)"]), functionName: "approve", args: [spender, amount] });
  return send({ to: token, data });
}

export async function allowance(token: Address, spender: Address): Promise<bigint> {
  return (await pub().readContract({ address: token, abi: parseAbi(["function allowance(address,address) view returns (uint256)"]), functionName: "allowance", args: [account!, spender] })) as bigint;
}

/**
 * Opens an arena attempt. The salt stays in this browser: commit = keccak256(salt) goes on-chain, and revealing
 * the salt to the arena engine later proves this wallet opened the attempt.
 */
export async function enterAttempt(arena: Address, arenaId: string): Promise<{ salt: Hex; tx: Hex }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const salt = toHex(bytes);
  const data = encodeFunctionData({
    abi: parseAbi(["function enterAttempt(uint256 arenaId, bytes32 transcriptCommit)"]),
    functionName: "enterAttempt",
    args: [BigInt(arenaId), keccak256(salt)],
  });
  const receipt = await send({ to: arena, data });
  return { salt, tx: receipt.transactionHash };
}

export async function tokenBalance(token: Address): Promise<bigint> {
  return (await pub().readContract({ address: token, abi: parseAbi(["function balanceOf(address) view returns (uint256)"]), functionName: "balanceOf", args: [account!] })) as bigint;
}
