import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { profileDir } from "./paths";
import type { ProfileManifest, ResourceEntry, ModEntry } from "../shared/types";

async function sha1File(p: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash("sha1");
    fs.createReadStream(p).on("data", c => h.update(c)).on("end", () => resolve(h.digest("hex"))).on("error", reject);
  });
}

async function downloadTo(url: string, dest: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Téléchargement KO " + url + " : " + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
}

async function syncBucket(items: (ModEntry | ResourceEntry)[], dir: string, onMsg: (m: string) => void) {
  fs.mkdirSync(dir, { recursive: true });
  const wanted = new Set(items.map(i => i.name));
  for (const item of items) {
    const dest = path.join(dir, item.name);
    let need = !fs.existsSync(dest);
    if (!need && item.sha1) {
      const cur = await sha1File(dest);
      need = cur.toLowerCase() !== item.sha1.toLowerCase();
    }
    if (need) {
      onMsg("Téléchargement " + item.name);
      await downloadTo(item.url, dest);
    }
  }
  // Nettoyer les fichiers requis ABSENTS du manifeste (uniquement ceux gérés — on
  // ne touche pas aux fichiers locaux ajoutés par l'utilisateur, donc ici on ne
  // supprime pas. Cf. décision design : l'utilisateur peut ajouter ses propres
  // mods sans qu'ils soient effacés à la synchro.)
  void wanted;
}

export async function syncProfileResources(profile: ProfileManifest, onMsg: (m: string) => void) {
  const pdir = profileDir(profile.id);
  if (profile.mods?.length) await syncBucket(profile.mods, path.join(pdir, "mods"), onMsg);
  if (profile.shaders?.length) await syncBucket(profile.shaders, path.join(pdir, "shaderpacks"), onMsg);
  if (profile.resourcePacks?.length) await syncBucket(profile.resourcePacks, path.join(pdir, "resourcepacks"), onMsg);
}
