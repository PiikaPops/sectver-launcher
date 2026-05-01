import { Auth } from "msmc";
import type { AuthAccount } from "../shared/types";
import { loadAccount, saveAccount } from "./store";

const authClient = new Auth("select_account");

export async function loginInteractive(): Promise<AuthAccount> {
  const xbox = await authClient.launch("electron");
  const mc = await xbox.getMinecraft();
  const profile: any = mc.profile;
  const account: AuthAccount = {
    uuid: profile.id,
    username: profile.name,
    accessToken: mc.mcToken,
    refreshToken: (xbox as any).msToken?.refresh_token ?? "",
    expiresAt: Date.now() + 23 * 60 * 60 * 1000
  };
  saveAccount(account);
  return account;
}

export async function getCurrent(): Promise<AuthAccount | null> {
  const a = loadAccount();
  if (!a) return null;
  if (Date.now() > a.expiresAt - 60_000 && a.refreshToken) {
    try {
      const xbox = await authClient.refresh(a.refreshToken);
      const mc = await xbox.getMinecraft();
      const refreshed: AuthAccount = {
        ...a,
        accessToken: mc.mcToken,
        refreshToken: (xbox as any).msToken?.refresh_token ?? a.refreshToken,
        expiresAt: Date.now() + 23 * 60 * 60 * 1000
      };
      saveAccount(refreshed);
      return refreshed;
    } catch {
      saveAccount(null);
      return null;
    }
  }
  return a;
}

export function logout() {
  saveAccount(null);
}
