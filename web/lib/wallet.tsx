"use client";

/**
 * Wallet context. EIP-6963 discovery (+ legacy window.ethereum fallback);
 * the client handed to every write is createClient({chain, account, provider})
 * — the CONNECTED provider, never a fallback (S6). SIWE against the app's own
 * /api/auth is best-effort: chain reads and writes keep working even when
 * sessions are unconfigured.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "genlayer-js";
import { getAddress } from "viem";
import { createSiweMessage } from "viem/siwe";
import { CHAIN, CHAIN_HEX, CHAIN_NAME, CHAIN_RPC } from "./chain/config";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Client = any;
type Eip1193 = any;

export type WalletInfo = { uuid: string; name: string; icon: string; rdns: string };
export type Discovered = { info: WalletInfo; provider: Eip1193 };

type WalletState = {
  address: string;
  client: Client | null;
  connecting: boolean;
  wallets: Discovered[];
  siweOk: boolean;
  connect: (d: Discovered) => Promise<void>;
  disconnect: () => void;
};

const Ctx = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet outside WalletProvider");
  return v;
}

async function ensureChain(provider: Eip1193): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_HEX }],
    });
  } catch (err: any) {
    if (err?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_HEX,
            chainName: CHAIN_NAME,
            rpcUrls: [CHAIN_RPC],
            nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
          },
        ],
      });
    }
  }
}

/** Best-effort SIWE session with the app's own API. Failure is tolerated. */
async function trySiwe(provider: Eip1193, address: string): Promise<boolean> {
  try {
    const nonceRes = await fetch("/api/auth/nonce", { credentials: "include" });
    if (!nonceRes.ok) return false;
    const { nonce } = (await nonceRes.json()) as { nonce: string };
    const message = createSiweMessage({
      address: address as `0x${string}`,
      chainId: CHAIN.id,
      domain: window.location.host,
      nonce,
      uri: window.location.origin,
      version: "1",
    });
    const signature = await provider.request({
      method: "personal_sign",
      params: [message, address],
    });
    const verify = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message, signature }),
    });
    return verify.ok;
  } catch {
    return false;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState("");
  const [client, setClient] = useState<Client | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [wallets, setWallets] = useState<Discovered[]>([]);
  const [siweOk, setSiweOk] = useState(false);
  const providerRef = useRef<Eip1193 | null>(null);

  const disconnect = useCallback(() => {
    setAddress("");
    setClient(null);
    setSiweOk(false);
    providerRef.current = null;
    void fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(
      () => {},
    );
  }, []);

  const connect = useCallback(
    async (d: Discovered) => {
      setConnecting(true);
      try {
        const provider = d.provider;
        const accounts: string[] = await provider.request({
          method: "eth_requestAccounts",
        });
        if (!accounts?.[0]) throw new Error("no account");
        const addr = getAddress(accounts[0]);
        await ensureChain(provider);
        providerRef.current = provider;
        setClient(createClient({ chain: CHAIN, account: addr, provider }));
        setAddress(addr);
        setSiweOk(await trySiwe(provider, addr));

        const onAccounts = (accs: string[]) => {
          if (accs?.[0]) {
            const a = getAddress(accs[0]);
            setAddress(a);
            setClient(createClient({ chain: CHAIN, account: a, provider }));
            setSiweOk(false);
            void trySiwe(provider, a).then(setSiweOk);
          } else {
            disconnect();
          }
        };
        provider.removeListener?.("accountsChanged", onAccounts);
        provider.on?.("accountsChanged", onAccounts);
      } finally {
        setConnecting(false);
      }
    },
    [disconnect],
  );

  // EIP-6963 discovery (+ legacy window.ethereum fallback).
  useEffect(() => {
    function onAnnounce(e: Event) {
      const d = (e as CustomEvent).detail as Discovered;
      if (!d?.info?.uuid) return;
      setWallets((prev) =>
        prev.some((w) => w.info.uuid === d.info.uuid) ? prev : [...prev, d],
      );
    }
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    const t = setTimeout(() => {
      const eth = (window as any).ethereum;
      if (eth) {
        setWallets((prev) =>
          prev.length
            ? prev
            : [
                {
                  info: {
                    uuid: "legacy",
                    name: "Browser wallet",
                    icon: "",
                    rdns: "legacy.injected",
                  },
                  provider: eth,
                },
              ],
        );
      }
    }, 400);
    return () => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      clearTimeout(t);
    };
  }, []);

  return (
    <Ctx.Provider
      value={{ address, client, connecting, wallets, siweOk, connect, disconnect }}
    >
      {children}
    </Ctx.Provider>
  );
}
