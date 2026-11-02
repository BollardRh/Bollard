/**
 * Content-addressed blob storage for run bundles (doc §5.7). Supabase Storage in production; in memory for
 * tests and local runs. Bundles are stored under their bundle hash, so a stored object can always be
 * checked against its name.
 */
export interface BlobStore {
  put(bucket: string, path: string, body: string, contentType?: string): Promise<void>;
  get(bucket: string, path: string): Promise<string | null>;
  publicUrl(bucket: string, path: string): string;
}

export class SupabaseStorage implements BlobStore {
  constructor(
    private readonly url: string,
    private readonly serviceKey: string,
  ) {}

  private headers(extra: Record<string, string> = {}) {
    return { authorization: `Bearer ${this.serviceKey}`, apikey: this.serviceKey, ...extra };
  }

  async put(bucket: string, path: string, body: string, contentType = "application/json") {
    const r = await fetch(`${this.url}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: this.headers({ "content-type": contentType, "x-upsert": "true", "cache-control": "max-age=31536000, immutable" }),
      body,
    });
    if (!r.ok) throw new Error(`storage put ${bucket}/${path}: ${r.status} ${await r.text()}`);
  }

  async get(bucket: string, path: string) {
    const r = await fetch(`${this.url}/storage/v1/object/authenticated/${bucket}/${path}`, { headers: this.headers() });
    if (r.status === 400 || r.status === 404) return null;
    if (!r.ok) throw new Error(`storage get ${bucket}/${path}: ${r.status}`);
    return r.text();
  }

  publicUrl(bucket: string, path: string) {
    return `${this.url}/storage/v1/object/public/${bucket}/${path}`;
  }
}

export class MemoryStorage implements BlobStore {
  readonly objects = new Map<string, string>();
  async put(bucket: string, path: string, body: string) {
    this.objects.set(`${bucket}/${path}`, body);
  }
  async get(bucket: string, path: string) {
    return this.objects.get(`${bucket}/${path}`) ?? null;
  }
  publicUrl(bucket: string, path: string) {
    return `memory://${bucket}/${path}`;
  }
}
