import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * Real workspace file checkpoints. Before a destructive tool runs, we snapshot
 * the exact bytes of the file(s) it will touch. `/rewind` restores them — so
 * the agent can never leave your tree in a broken state you can't undo.
 *
 * Snapshots live under ~/.codeva/checkpoints/<sessionId>/<n>/ as a manifest +
 * the captured file contents. This is filesystem-level time travel, not just
 * conversation rewind.
 */

function checkpointRoot(): string {
  const dir = join(homedir(), '.codeva', 'checkpoints');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export interface CheckpointEntry {
  seq: number;
  label: string;
  createdAt: number;
  files: { path: string; existed: boolean }[];
}

export class WorkspaceCheckpoints {
  private readonly dir: string;
  private seq = 0;

  constructor(sessionId: string, private readonly cwd: string = process.cwd()) {
    this.dir = join(checkpointRoot(), sessionId);
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
    // Resume seq from existing entries.
    this.seq = this.list().reduce((max, e) => Math.max(max, e.seq), 0);
  }

  /**
   * Snapshot the given files (by absolute or cwd-relative path) before they are
   * modified. Files that don't exist yet are recorded as "existed:false" so a
   * rewind deletes them. Returns the checkpoint sequence number.
   */
  snapshot(paths: string[], label: string): number {
    const seq = ++this.seq;
    const cpDir = join(this.dir, String(seq));
    mkdirSync(cpDir, { recursive: true });

    const files: CheckpointEntry['files'] = [];
    for (const p of paths) {
      const abs = resolve(this.cwd, p);
      const existed = existsSync(abs);
      const safeName = createHash('sha1').update(abs).digest('hex');
      if (existed) {
        try {
          const content = readFileSync(abs);
          writeFileSync(join(cpDir, safeName), content);
        } catch {
          continue;
        }
      }
      files.push({ path: abs, existed });
    }

    const entry: CheckpointEntry = { seq, label, createdAt: Date.now(), files };
    writeFileSync(join(cpDir, 'manifest.json'), JSON.stringify(entry, null, 2), 'utf8');
    return seq;
  }

  /** List checkpoints, newest first. */
  list(): CheckpointEntry[] {
    if (!existsSync(this.dir)) return [];
    const out: CheckpointEntry[] = [];
    for (const name of readdirSync(this.dir)) {
      const manifest = join(this.dir, name, 'manifest.json');
      if (existsSync(manifest)) {
        try {
          out.push(JSON.parse(readFileSync(manifest, 'utf8')));
        } catch {
          /* skip corrupt */
        }
      }
    }
    return out.sort((a, b) => b.seq - a.seq);
  }

  /**
   * Restore the workspace to the state captured at `seq` (and undo everything
   * after it). Files that didn't exist at snapshot time are deleted; existing
   * files are rewritten with their captured bytes.
   */
  restore(seq: number): { restored: number; deleted: number } {
    let restored = 0;
    let deleted = 0;
    // Apply all checkpoints from newest down to `seq` so later changes are
    // undone in reverse order.
    const entries = this.list().filter((e) => e.seq >= seq).sort((a, b) => b.seq - a.seq);
    for (const entry of entries) {
      const cpDir = join(this.dir, String(entry.seq));
      for (const f of entry.files) {
        const safeName = createHash('sha1').update(f.path).digest('hex');
        const snapPath = join(cpDir, safeName);
        if (f.existed && existsSync(snapPath)) {
          try {
            const d = dirname(f.path);
            if (!existsSync(d)) mkdirSync(d, { recursive: true });
            writeFileSync(f.path, readFileSync(snapPath));
            restored++;
          } catch {
            /* ignore */
          }
        } else if (!f.existed && existsSync(f.path)) {
          try {
            rmSync(f.path, { force: true });
            deleted++;
          } catch {
            /* ignore */
          }
        }
      }
    }
    return { restored, deleted };
  }

  /** Human-readable relative path for display. */
  rel(abs: string): string {
    return relative(this.cwd, abs) || abs;
  }
}
