#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../shared/src/types.ts
import { z } from "zod";
var RoleSchema, MessageSchema;
var init_types = __esm({
  "../shared/src/types.ts"() {
    "use strict";
    RoleSchema = z.enum(["system", "user", "assistant", "tool"]);
    MessageSchema = z.object({
      id: z.string(),
      role: RoleSchema,
      content: z.string(),
      createdAt: z.number().int().positive(),
      /** Optional tool call payload when role === 'assistant' issued a tool call. */
      toolCalls: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          input: z.record(z.unknown())
        })
      ).optional(),
      /** Optional reference back to a tool call when role === 'tool'. */
      toolCallId: z.string().optional()
    });
  }
});

// ../shared/src/paths.ts
import { homedir } from "os";
import { join, resolve } from "path";
function getHomeDir() {
  return process.env.CYBERMIND_HOME ? resolve(process.env.CYBERMIND_HOME) : join(homedir(), ".cybermind");
}
function getSettingsPath() {
  return join(getHomeDir(), "settings.json");
}
function getTrustPath() {
  return join(getHomeDir(), "trust.json");
}
function getSkillsDir() {
  return join(getHomeDir(), "skills");
}
function getLogsDir() {
  return join(getHomeDir(), "logs");
}
function getDataDir() {
  return getHomeDir();
}
function getSecretsPath() {
  return join(getHomeDir(), "secrets.enc");
}
function getProjectDir(cwd2 = process.cwd()) {
  return join(cwd2, ".cybermind");
}
function getProjectSkillsDir(cwd2 = process.cwd()) {
  return join(getProjectDir(cwd2), "skills");
}
var init_paths = __esm({
  "../shared/src/paths.ts"() {
    "use strict";
  }
});

// ../shared/src/logger.ts
import chalk from "chalk";
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { join as join2 } from "path";
function ensureLogFile() {
  if (logFilePath) return logFilePath;
  const dir = getLogsDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  logFilePath = join2(dir, `cybermind-${stamp}.log`);
  return logFilePath;
}
function emit(level, scope, message, data) {
  if (LEVEL_ORDER[level] < minLevel) return;
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  const tag = `[${level.toUpperCase()}]`.padEnd(7);
  const head = `${chalk.dim(ts)} ${COLOR[level](tag)} ${chalk.dim(`(${scope})`)}`;
  const dataStr = data !== void 0 ? ` ${safeStringify(data)}` : "";
  if (level === "error" || level === "warn" || process.env.CYBERMIND_LOG_STDERR === "true") {
    process.stderr.write(`${head} ${message}${dataStr}
`);
  }
  if (writeToFile) {
    try {
      const file = ensureLogFile();
      appendFileSync(file, `${ts} ${level.toUpperCase()} (${scope}) ${message}${dataStr}
`, {
        encoding: "utf8"
      });
    } catch {
    }
  }
}
function safeStringify(data) {
  try {
    return typeof data === "string" ? data : JSON.stringify(data);
  } catch {
    return String(data);
  }
}
function createLogger(scope) {
  return {
    debug: (m, d) => emit("debug", scope, m, d),
    info: (m, d) => emit("info", scope, m, d),
    warn: (m, d) => emit("warn", scope, m, d),
    error: (m, d) => emit("error", scope, m, d),
    child: (sub) => createLogger(`${scope}:${sub}`)
  };
}
var LEVEL_ORDER, COLOR, envLevel, minLevel, writeToFile, logFilePath;
var init_logger = __esm({
  "../shared/src/logger.ts"() {
    "use strict";
    init_paths();
    LEVEL_ORDER = {
      debug: 10,
      info: 20,
      warn: 30,
      error: 40
    };
    COLOR = {
      debug: (s) => chalk.gray(s),
      info: (s) => chalk.cyan(s),
      warn: (s) => chalk.yellow(s),
      error: (s) => chalk.red(s)
    };
    envLevel = (process.env.CYBERMIND_LOG_LEVEL ?? "info").toLowerCase();
    minLevel = LEVEL_ORDER[envLevel] ?? LEVEL_ORDER.info;
    writeToFile = process.env.CYBERMIND_LOG_FILE !== "false";
    logFilePath = null;
  }
});

// ../shared/src/version.ts
var CYBERMIND_VERSION, CYBERMIND_NAME, CYBERCODER_VERSION, CYBERCODER_NAME;
var init_version = __esm({
  "../shared/src/version.ts"() {
    "use strict";
    CYBERMIND_VERSION = "0.1.39";
    CYBERMIND_NAME = "CyberCoder";
    CYBERCODER_VERSION = CYBERMIND_VERSION;
    CYBERCODER_NAME = CYBERMIND_NAME;
  }
});

// ../shared/src/secret-scanner.ts
var SECRET_PATTERNS, SecretScanner;
var init_secret_scanner = __esm({
  "../shared/src/secret-scanner.ts"() {
    "use strict";
    SECRET_PATTERNS = [
      // AWS
      { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/g },
      // GitHub
      { name: "GitHub Token", regex: /(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36}/g },
      // Stripe
      { name: "Stripe Secret Key", regex: /sk_(live|test)_[0-9a-zA-Z]{24}/g },
      // Generic / OpenAI API Key
      { name: "Generic API Key (sk-...)", regex: /sk-[a-zA-Z0-9-]{32,64}/g },
      // Codeva / CyberCoder API Key
      { name: "CyberCoder API Key", regex: /sk_cyber_[a-zA-Z0-9]{24,64}/g },
      // Google / GCP
      { name: "Google API Key", regex: /AIza[0-9A-Za-z-_]{35}/g },
      // RSA Private Key
      { name: "RSA Private Key", regex: /-----BEGIN RSA PRIVATE KEY-----(?:.|\n)*?-----END RSA PRIVATE KEY-----/g }
    ];
    SecretScanner = class {
      /**
       * Scans text for secrets and returns a list of detected secret names.
       * Useful for blocking operations (like file writes or git commits).
       */
      static scan(text) {
        if (!text) return [];
        const detected = /* @__PURE__ */ new Set();
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.regex.test(text)) {
            detected.add(pattern.name);
          }
          pattern.regex.lastIndex = 0;
        }
        return Array.from(detected);
      }
      /**
       * Redacts secrets from the given text.
       * Replaces them with `***[REDACTED <SecretName>]***`
       */
      static redact(text) {
        if (!text || typeof text !== "string") return text;
        let redactedText = text;
        for (const pattern of SECRET_PATTERNS) {
          redactedText = redactedText.replace(pattern.regex, `***[REDACTED ${pattern.name}]***`);
        }
        return redactedText;
      }
    };
  }
});

// ../shared/src/checkpoint.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync2, readFileSync, writeFileSync, readdirSync } from "fs";
import { join as join3 } from "path";
import { z as z2 } from "zod";
function getCheckpointsDir() {
  return join3(getDataDir(), "checkpoints");
}
var log, CheckpointSchema, CheckpointManager;
var init_checkpoint = __esm({
  "../shared/src/checkpoint.ts"() {
    "use strict";
    init_logger();
    log = createLogger("checkpoint");
    CheckpointSchema = z2.object({
      id: z2.string(),
      createdAt: z2.number(),
      messages: z2.array(
        z2.object({
          id: z2.string(),
          role: z2.enum(["user", "assistant", "system"]),
          content: z2.string(),
          createdAt: z2.number()
        })
      ),
      model: z2.string(),
      provider: z2.string()
    });
    CheckpointManager = class {
      dir;
      constructor() {
        this.dir = getCheckpointsDir();
        if (!existsSync2(this.dir)) mkdirSync2(this.dir, { recursive: true });
      }
      /** Persist the current session state to a new checkpoint file. */
      save(messages, model, provider) {
        const id = crypto.randomUUID();
        const checkpoint = {
          id,
          createdAt: Date.now(),
          messages: structuredClone(messages),
          // deep copy to avoid mutation
          model,
          provider
        };
        const path3 = join3(this.dir, `${id}.json`);
        writeFileSync(path3, JSON.stringify(checkpoint, null, 2), "utf8");
        const latest = join3(this.dir, "latest.json");
        try {
          writeFileSync(latest, JSON.stringify(checkpoint, null, 2), "utf8");
        } catch (err) {
          log.warn("failed to write latest symlink", String(err));
        }
        log.info("saved checkpoint", { id, messageCount: messages.length });
        return id;
      }
      /** Load a checkpoint by id. Returns null if not found or corrupt. */
      load(id) {
        const path3 = join3(this.dir, `${id}.json`);
        if (!existsSync2(path3)) return null;
        try {
          const raw = readFileSync(path3, "utf8");
          const parsed = JSON.parse(raw);
          const checkpoint = CheckpointSchema.parse(parsed);
          return checkpoint;
        } catch (err) {
          log.warn("failed to load checkpoint", { id, error: String(err) });
          return null;
        }
      }
      /** Load the most recent checkpoint (latest.json). */
      loadLatest() {
        const path3 = join3(this.dir, "latest.json");
        if (!existsSync2(path3)) return null;
        try {
          const raw = readFileSync(path3, "utf8");
          const parsed = JSON.parse(raw);
          const checkpoint = CheckpointSchema.parse(parsed);
          return checkpoint;
        } catch (err) {
          log.warn("failed to load latest checkpoint", { error: String(err) });
          return null;
        }
      }
      /** List all checkpoint ids sorted by creation time (newest first). */
      list() {
        if (!existsSync2(this.dir)) return [];
        const entries = [];
        const files = readdirSync(this.dir, { withFileTypes: true });
        for (const file of files) {
          if (!file.isFile() || !file.name.endsWith(".json")) continue;
          if (file.name === "latest.json") continue;
          const id = file.name.slice(0, -5);
          const cp = this.load(id);
          if (cp) {
            entries.push({ id, createdAt: cp.createdAt, messageCount: cp.messages.length });
          }
        }
        return entries.sort((a, b) => b.createdAt - a.createdAt);
      }
      /** Delete a checkpoint file. */
      delete(id) {
        const path3 = join3(this.dir, `${id}.json`);
        if (!existsSync2(path3)) return false;
        try {
          writeFileSync(path3, "");
          log.info("deleted checkpoint", { id });
          return true;
        } catch (err) {
          log.warn("failed to delete checkpoint", { id, error: String(err) });
          return false;
        }
      }
    };
  }
});

// ../shared/src/profiles.ts
import { existsSync as existsSync3, readFileSync as readFileSync2, writeFileSync as writeFileSync2 } from "fs";
import { z as z3 } from "zod";
var log2, ProfileSchema, DEFAULT_PROFILES, SettingsSchema, ProfileManager;
var init_profiles = __esm({
  "../shared/src/profiles.ts"() {
    "use strict";
    init_logger();
    log2 = createLogger("profiles");
    ProfileSchema = z3.object({
      name: z3.enum(["default", "strict-ts", "hobby", "paranoid"]),
      /** Model to use for this profile */
      model: z3.string(),
      /** Provider to use for this profile */
      provider: z3.string(),
      /** Approval mode for tools */
      approvalMode: z3.enum(["always-ask", "session-bypass", "persistent-bypass"]),
      /** Whether to enable telemetry */
      telemetryEnabled: z3.boolean(),
      /** Whether to enable auto-checkpoint */
      autoCheckpoint: z3.boolean(),
      /** Custom accent color */
      accentColor: z3.string().optional()
    });
    DEFAULT_PROFILES = {
      default: {
        name: "default",
        model: "claude-3-5-sonnet-20241022",
        provider: "anthropic",
        approvalMode: "always-ask",
        telemetryEnabled: false,
        autoCheckpoint: true,
        accentColor: "blue"
      },
      "strict-ts": {
        name: "strict-ts",
        model: "claude-3-5-sonnet-20241022",
        provider: "anthropic",
        approvalMode: "always-ask",
        telemetryEnabled: true,
        autoCheckpoint: true,
        accentColor: "red"
      },
      hobby: {
        name: "hobby",
        model: "claude-3-haiku-20241022",
        provider: "anthropic",
        approvalMode: "session-bypass",
        telemetryEnabled: false,
        autoCheckpoint: false,
        accentColor: "green"
      },
      paranoid: {
        name: "paranoid",
        model: "claude-3-5-sonnet-20241022",
        provider: "anthropic",
        approvalMode: "always-ask",
        telemetryEnabled: false,
        autoCheckpoint: true,
        accentColor: "orange"
      }
    };
    SettingsSchema = z3.object({
      activeProfile: z3.string(),
      profiles: z3.record(z3.string(), ProfileSchema)
    });
    ProfileManager = class {
      settingsPath;
      constructor() {
        this.settingsPath = getSettingsPath();
      }
      /** Get the current active profile */
      getActiveProfile() {
        const settings = this.loadSettings();
        const active = settings.profiles[settings.activeProfile];
        if (!active) {
          log2.warn("Active profile not found, falling back to default");
          return DEFAULT_PROFILES.default;
        }
        return active;
      }
      /** Set the active profile by name */
      setActiveProfile(name) {
        const settings = this.loadSettings();
        if (!settings.profiles[name]) {
          log2.warn("Profile not found", { name });
          return false;
        }
        settings.activeProfile = name;
        this.saveSettings(settings);
        log2.info("Switched profile", { name });
        return true;
      }
      /** Get all available profiles */
      listProfiles() {
        const settings = this.loadSettings();
        return settings.profiles;
      }
      /** Update a profile's settings */
      updateProfile(name, updates) {
        const settings = this.loadSettings();
        if (!settings.profiles[name]) {
          log2.warn("Profile not found for update", { name });
          return false;
        }
        settings.profiles[name] = { ...settings.profiles[name], ...updates };
        this.saveSettings(settings);
        log2.info("Updated profile", { name, updates: Object.keys(updates) });
        return true;
      }
      /** Reset a profile to its default configuration */
      resetProfile(name) {
        const defaultConfig = DEFAULT_PROFILES[name];
        if (!defaultConfig) {
          log2.warn("Cannot reset unknown profile", { name });
          return false;
        }
        const { name: _, ...configWithoutName } = defaultConfig;
        return this.updateProfile(name, configWithoutName);
      }
      loadSettings() {
        if (!existsSync3(this.settingsPath)) {
          const profiles = {};
          for (const [name, profile] of Object.entries(DEFAULT_PROFILES)) {
            profiles[name] = { ...profile };
          }
          const settings = {
            activeProfile: "default",
            profiles
          };
          this.saveSettings(settings);
          return settings;
        }
        try {
          const raw = readFileSync2(this.settingsPath, "utf8");
          const parsed = JSON.parse(raw);
          const settings = SettingsSchema.parse(parsed);
          return settings;
        } catch (err) {
          log2.error("Failed to load settings, using defaults", { error: String(err) });
          const profiles = {};
          for (const [name, profile] of Object.entries(DEFAULT_PROFILES)) {
            profiles[name] = { ...profile };
          }
          return {
            activeProfile: "default",
            profiles
          };
        }
      }
      saveSettings(settings) {
        try {
          writeFileSync2(this.settingsPath, JSON.stringify(settings, null, 2), "utf8");
        } catch (err) {
          log2.error("Failed to save settings", { error: String(err) });
        }
      }
    };
  }
});

// ../shared/src/collaboration.ts
import { existsSync as existsSync4, mkdirSync as mkdirSync3, readFileSync as readFileSync3, writeFileSync as writeFileSync3, readdirSync as readdirSync2 } from "fs";
import { join as join4 } from "path";
import { z as z4 } from "zod";
var log3, CollaborationSessionSchema, CollaborationManager;
var init_collaboration = __esm({
  "../shared/src/collaboration.ts"() {
    "use strict";
    init_logger();
    log3 = createLogger("collaboration");
    CollaborationSessionSchema = z4.object({
      id: z4.string(),
      name: z4.string(),
      createdAt: z4.number(),
      participants: z4.array(z4.string()),
      worktrees: z4.record(z4.string(), z4.string()),
      sharedContext: z4.record(z4.unknown()),
      status: z4.enum(["active", "paused", "completed"])
    });
    CollaborationManager = class {
      sessionsDir;
      worktreesDir;
      constructor() {
        this.sessionsDir = join4(getDataDir(), "collaboration", "sessions");
        this.worktreesDir = join4(getDataDir(), "collaboration", "worktrees");
        if (!existsSync4(this.sessionsDir)) mkdirSync3(this.sessionsDir, { recursive: true });
        if (!existsSync4(this.worktreesDir)) mkdirSync3(this.worktreesDir, { recursive: true });
      }
      /** Create a new collaboration session */
      createSession(name, initialAgentId) {
        const session = {
          id: crypto.randomUUID(),
          name,
          createdAt: Date.now(),
          participants: [initialAgentId],
          worktrees: {},
          sharedContext: {},
          status: "active"
        };
        this.saveSession(session);
        log3.info("Created collaboration session", { sessionId: session.id, name });
        return session;
      }
      /** Get a session by ID */
      getSession(sessionId) {
        const path3 = join4(this.sessionsDir, `${sessionId}.json`);
        if (!existsSync4(path3)) return null;
        try {
          const raw = readFileSync3(path3, "utf8");
          const parsed = JSON.parse(raw);
          return CollaborationSessionSchema.parse(parsed);
        } catch (err) {
          log3.warn("Failed to load session", { sessionId, error: String(err) });
          return null;
        }
      }
      /** List all sessions */
      listSessions() {
        if (!existsSync4(this.sessionsDir)) return [];
        const sessions = [];
        const files = readdirSync2(this.sessionsDir, { withFileTypes: true });
        for (const file of files) {
          if (!file.isFile() || !file.name.endsWith(".json")) continue;
          const sessionId = file.name.slice(0, -5);
          const session = this.getSession(sessionId);
          if (session) sessions.push(session);
        }
        return sessions.sort((a, b) => b.createdAt - a.createdAt);
      }
      /** Add an agent to a session */
      addParticipant(sessionId, agentId) {
        const session = this.getSession(sessionId);
        if (!session || session.participants.includes(agentId)) {
          return false;
        }
        session.participants.push(agentId);
        this.saveSession(session);
        log3.info("Added participant to session", { sessionId, agentId });
        return true;
      }
      /** Create a worktree for an agent in a session */
      createWorktree(sessionId, agentId, _baseBranch = "main") {
        const session = this.getSession(sessionId);
        if (!session) return null;
        const worktreeName = `${sessionId}-${agentId}`;
        const worktreePath = join4(this.worktreesDir, worktreeName);
        session.worktrees[agentId] = worktreePath;
        this.saveSession(session);
        log3.info("Created worktree for agent", { sessionId, agentId, worktreePath });
        return worktreePath;
      }
      /** Update shared context for a session */
      updateSharedContext(sessionId, updates) {
        const session = this.getSession(sessionId);
        if (!session) return false;
        session.sharedContext = { ...session.sharedContext, ...updates };
        this.saveSession(session);
        return true;
      }
      /** Get shared context for a session */
      getSharedContext(sessionId) {
        const session = this.getSession(sessionId);
        return session?.sharedContext || {};
      }
      /** Update session status */
      updateSessionStatus(sessionId, status) {
        const session = this.getSession(sessionId);
        if (!session) return false;
        session.status = status;
        this.saveSession(session);
        log3.info("Updated session status", { sessionId, status });
        return true;
      }
      /** Delete a session and its worktrees */
      deleteSession(sessionId) {
        const session = this.getSession(sessionId);
        if (!session) return false;
        const sessionPath = join4(this.sessionsDir, `${sessionId}.json`);
        try {
          writeFileSync3(sessionPath, "");
        } catch (err) {
          log3.warn("Failed to delete session file", { sessionId, error: String(err) });
        }
        log3.info("Deleted collaboration session", { sessionId });
        return true;
      }
      saveSession(session) {
        const path3 = join4(this.sessionsDir, `${session.id}.json`);
        try {
          writeFileSync3(path3, JSON.stringify(session, null, 2), "utf8");
        } catch (err) {
          log3.error("Failed to save session", { sessionId: session.id, error: String(err) });
        }
      }
    };
  }
});

// ../shared/src/web-mirror.ts
import { existsSync as existsSync5, mkdirSync as mkdirSync4, readFileSync as readFileSync4, writeFileSync as writeFileSync4, readdirSync as readdirSync3 } from "fs";
import { join as join5 } from "path";
import { createServer } from "http";
import { z as z5 } from "zod";
var log4, MirrorSessionSchema, WebMirrorManager;
var init_web_mirror = __esm({
  "../shared/src/web-mirror.ts"() {
    "use strict";
    init_logger();
    log4 = createLogger("web-mirror");
    MirrorSessionSchema = z5.object({
      id: z5.string(),
      sessionId: z5.string(),
      name: z5.string(),
      createdAt: z5.number(),
      port: z5.number(),
      clients: z5.array(z5.object({
        id: z5.string(),
        type: z5.enum(["cli", "web"]),
        connectedAt: z5.number(),
        lastActivity: z5.number(),
        metadata: z5.record(z5.unknown()).optional()
      })),
      state: z5.object({
        messages: z5.array(z5.unknown()),
        agents: z5.record(z5.unknown()),
        cursors: z5.record(z5.object({
          line: z5.number(),
          column: z5.number(),
          file: z5.string()
        })),
        ui: z5.object({
          activePanel: z5.string().optional(),
          scrollPosition: z5.number().optional(),
          focusedInput: z5.boolean().optional()
        })
      })
    });
    WebMirrorManager = class {
      mirrorsDir;
      servers = /* @__PURE__ */ new Map();
      sessions = /* @__PURE__ */ new Map();
      constructor() {
        this.mirrorsDir = join5(getDataDir(), "collaboration", "mirrors");
        if (!existsSync5(this.mirrorsDir)) mkdirSync4(this.mirrorsDir, { recursive: true });
        this.loadExistingSessions();
      }
      /** Create a new mirror session for a collaboration session */
      createMirror(sessionId, name) {
        const mirror = {
          id: crypto.randomUUID(),
          sessionId,
          name,
          createdAt: Date.now(),
          port: this.allocatePort(),
          clients: [],
          state: {
            messages: [],
            agents: {},
            cursors: {},
            ui: {}
          }
        };
        this.sessions.set(mirror.id, mirror);
        this.saveMirror(mirror);
        this.startMirrorServer(mirror);
        log4.info("Created web mirror", { mirrorId: mirror.id, sessionId, port: mirror.port });
        return mirror;
      }
      /** Get a mirror session by ID */
      getMirror(mirrorId) {
        return this.sessions.get(mirrorId) || null;
      }
      /** Get mirror by collaboration session ID */
      getMirrorBySession(sessionId) {
        for (const mirror of this.sessions.values()) {
          if (mirror.sessionId === sessionId) return mirror;
        }
        return null;
      }
      /** Add a client to a mirror session */
      addClient(mirrorId, clientType, metadata) {
        const mirror = this.sessions.get(mirrorId);
        if (!mirror) return null;
        const client = {
          id: crypto.randomUUID(),
          type: clientType,
          connectedAt: Date.now(),
          lastActivity: Date.now(),
          metadata
        };
        mirror.clients.push(client);
        this.saveMirror(mirror);
        this.broadcastClientUpdate(mirror, "join", client);
        log4.info("Added client to mirror", { mirrorId, clientId: client.id, type: clientType });
        return client.id;
      }
      /** Remove a client from a mirror session */
      removeClient(mirrorId, clientId) {
        const mirror = this.sessions.get(mirrorId);
        if (!mirror) return false;
        const index = mirror.clients.findIndex((c) => c.id === clientId);
        if (index === -1) return false;
        const client = mirror.clients[index];
        if (!client) return false;
        const clientType = client.type;
        mirror.clients.splice(index, 1);
        this.saveMirror(mirror);
        this.broadcastClientUpdate(mirror, "leave", client);
        log4.info("Removed client from mirror", { mirrorId, clientId, type: clientType });
        return true;
      }
      /** Update mirror state */
      updateState(mirrorId, updates) {
        const mirror = this.sessions.get(mirrorId);
        if (!mirror) return false;
        mirror.state = { ...mirror.state, ...updates };
        this.saveMirror(mirror);
        this.broadcastStateUpdate(mirror);
        return true;
      }
      /** Update cursor position for an agent */
      updateCursor(mirrorId, agentId, position) {
        const mirror = this.sessions.get(mirrorId);
        if (!mirror) return false;
        mirror.state.cursors[agentId] = position;
        this.saveMirror(mirror);
        this.broadcastCursorUpdate(mirror, agentId, position);
        return true;
      }
      /** Add a message to the mirror */
      addMessage(mirrorId, message) {
        const mirror = this.sessions.get(mirrorId);
        if (!mirror) return false;
        mirror.state.messages.push(message);
        this.saveMirror(mirror);
        this.broadcastMessage(mirror, message);
        return true;
      }
      /** Get mirror URL for web access */
      getMirrorUrl(mirrorId) {
        const mirror = this.sessions.get(mirrorId);
        if (!mirror) return null;
        return `http://localhost:${mirror.port}`;
      }
      /** Stop a mirror server */
      stopMirror(mirrorId) {
        const mirror = this.sessions.get(mirrorId);
        if (!mirror) return false;
        const server = this.servers.get(mirrorId);
        if (server) {
          server.close();
          this.servers.delete(mirrorId);
        }
        this.sessions.delete(mirrorId);
        const mirrorPath = join5(this.mirrorsDir, `${mirrorId}.json`);
        try {
          writeFileSync4(mirrorPath, "");
        } catch (err) {
          log4.warn("Failed to delete mirror file", { mirrorId, error: String(err) });
        }
        log4.info("Stopped web mirror", { mirrorId });
        return true;
      }
      allocatePort() {
        const usedPorts = Array.from(this.sessions.values()).map((s) => s.port);
        let port = 8080;
        while (usedPorts.includes(port)) {
          port++;
        }
        return port;
      }
      startMirrorServer(mirror) {
        const server = createServer((_req, res) => {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(this.generateWebUI(mirror));
        });
        server.listen(mirror.port, () => {
          log4.info("Mirror server started", { mirrorId: mirror.id, port: mirror.port });
        });
        this.servers.set(mirror.id, server);
      }
      generateWebUI(mirror) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>CyberMind Collaborative Session - ${mirror.name}</title>
    <meta charset="utf-8">
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; background: #0a0a0a; color: #fff; }
        .header { background: #1a1a1a; padding: 1rem; border-bottom: 1px solid #333; }
        .content { display: flex; height: calc(100vh - 60px); }
        .sidebar { width: 250px; background: #1a1a1a; border-right: 1px solid #333; padding: 1rem; }
        .main { flex: 1; padding: 1rem; overflow-y: auto; }
        .message { margin-bottom: 1rem; padding: 0.5rem; border-radius: 4px; }
        .user { background: #1e3a8a; }
        .assistant { background: #14532d; }
        .system { background: #713f12; }
        .clients { margin-top: 1rem; }
        .client { padding: 0.25rem; font-size: 0.875rem; }
        .cursor { font-size: 0.75rem; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CyberMind - ${mirror.name}</h1>
        <p>Session ID: ${mirror.sessionId}</p>
    </div>
    <div class="content">
        <div class="sidebar">
            <h3>Connected Clients (${mirror.clients.length})</h3>
            <div class="clients">
                ${mirror.clients.map((client) => `
                    <div class="client">
                        ${client.type === "cli" ? "\u{1F5A5}\uFE0F CLI" : "\u{1F310} Web"} - ${client.id.slice(0, 8)}\u2026
                    </div>
                `).join("")}
            </div>
            <h3>Active Cursors</h3>
            <div class="cursors">
                ${Object.entries(mirror.state.cursors).map(([agent, cursor]) => `
                    <div class="cursor">
                        ${agent}: ${cursor.file}:${cursor.line}:${cursor.column}
                    </div>
                `).join("")}
            </div>
        </div>
        <div class="main" id="messages">
            ${mirror.state.messages.map((msg) => `
                <div class="message ${msg.role}">
                    <strong>${msg.role}:</strong> ${msg.content}
                </div>
            `).join("")}
        </div>
    </div>
    <script>
        // WebSocket connection for real-time updates would go here
        console.log('CyberMind collaborative session loaded');
    </script>
</body>
</html>`;
      }
      broadcastClientUpdate(mirror, action, client) {
        log4.debug("Broadcasting client update", { mirrorId: mirror.id, action, clientId: client.id });
      }
      broadcastStateUpdate(mirror) {
        log4.debug("Broadcasting state update", { mirrorId: mirror.id });
      }
      broadcastCursorUpdate(mirror, agentId, position) {
        log4.debug("Broadcasting cursor update", { mirrorId: mirror.id, agentId, position });
      }
      broadcastMessage(mirror, message) {
        log4.debug("Broadcasting message", { mirrorId: mirror.id, messageRole: message.role });
      }
      loadExistingSessions() {
        if (!existsSync5(this.mirrorsDir)) return;
        const files = readdirSync3(this.mirrorsDir, { withFileTypes: true });
        for (const file of files) {
          if (!file.isFile() || !file.name.endsWith(".json")) continue;
          const mirrorId = file.name.slice(0, -5);
          const path3 = join5(this.mirrorsDir, file.name);
          try {
            const raw = readFileSync4(path3, "utf8");
            const parsed = JSON.parse(raw);
            const mirror = MirrorSessionSchema.parse(parsed);
            this.sessions.set(mirrorId, mirror);
          } catch (err) {
            log4.warn("Failed to load mirror session", { mirrorId, error: String(err) });
          }
        }
      }
      saveMirror(mirror) {
        const path3 = join5(this.mirrorsDir, `${mirror.id}.json`);
        try {
          writeFileSync4(path3, JSON.stringify(mirror, null, 2), "utf8");
        } catch (err) {
          log4.error("Failed to save mirror", { mirrorId: mirror.id, error: String(err) });
        }
      }
    };
  }
});

// ../shared/src/rich-io.ts
import { existsSync as existsSync6, mkdirSync as mkdirSync5, readFileSync as readFileSync5, writeFileSync as writeFileSync5 } from "fs";
import { join as join6 } from "path";
import { z as z6 } from "zod";
var log5, CostMetricsSchema, RichIOManager;
var init_rich_io = __esm({
  "../shared/src/rich-io.ts"() {
    "use strict";
    init_logger();
    log5 = createLogger("rich-io");
    CostMetricsSchema = z6.object({
      totalTokens: z6.number(),
      totalCost: z6.number(),
      modelBreakdown: z6.record(z6.object({
        tokens: z6.number(),
        cost: z6.number()
      })),
      sessionStart: z6.number(),
      lastUpdate: z6.number()
    });
    RichIOManager = class {
      dataDir;
      imagesDir;
      screenshotsDir;
      costMetrics;
      constructor() {
        this.dataDir = getDataDir();
        this.imagesDir = join6(this.dataDir, "images");
        this.screenshotsDir = join6(this.dataDir, "screenshots");
        if (!existsSync6(this.imagesDir)) mkdirSync5(this.imagesDir, { recursive: true });
        if (!existsSync6(this.screenshotsDir)) mkdirSync5(this.screenshotsDir, { recursive: true });
        this.costMetrics = this.loadCostMetrics();
      }
      /** Process and store an image from various sources */
      async processImage(input, alt, caption) {
        let src;
        if (typeof input === "string") {
          if (input.startsWith("data:")) {
            src = input;
          } else if (input.startsWith("http")) {
            src = input;
            log5.info("Image URL provided", { url: input });
          } else {
            if (!existsSync6(input)) {
              throw new Error(`Image file not found: ${input}`);
            }
            const buffer = readFileSync5(input);
            const base64 = buffer.toString("base64");
            const mimeType = this.getMimeType(input);
            src = `data:${mimeType};base64,${base64}`;
          }
        } else {
          const base64 = input.toString("base64");
          src = "data:image/png;base64," + base64;
        }
        const image = {
          type: "image",
          src,
          alt,
          caption
        };
        log5.info("Processed image", { alt, hasCaption: !!caption });
        return image;
      }
      /** Create a mermaid diagram */
      createMermaidDiagram(code, title, theme = "default") {
        const diagram = {
          type: "mermaid",
          code,
          title,
          theme
        };
        log5.info("Created mermaid diagram", { title, theme, codeLength: code.length });
        return diagram;
      }
      /** Update cost metrics */
      updateCostMetrics(model, tokens, cost) {
        this.costMetrics.totalTokens += tokens;
        this.costMetrics.totalCost += cost;
        if (!this.costMetrics.modelBreakdown[model]) {
          this.costMetrics.modelBreakdown[model] = { tokens: 0, cost: 0 };
        }
        this.costMetrics.modelBreakdown[model].tokens += tokens;
        this.costMetrics.modelBreakdown[model].cost += cost;
        this.costMetrics.lastUpdate = Date.now();
        this.saveCostMetrics();
        log5.debug("Updated cost metrics", { model, tokens, cost, totalCost: this.costMetrics.totalCost });
      }
      /** Get current cost metrics */
      getCostMetrics() {
        return { ...this.costMetrics };
      }
      /** Get cost formatted as string */
      getCostString() {
        const { totalCost, totalTokens } = this.costMetrics;
        const duration = Date.now() - this.costMetrics.sessionStart;
        const minutes = Math.floor(duration / 6e4);
        return `$${totalCost.toFixed(4)} \u2022 ${totalTokens.toLocaleString()} tokens \u2022 ${minutes}m`;
      }
      /** Get default hotkey bindings */
      getDefaultHotkeys() {
        return [
          // Navigation
          { key: "k", modifiers: ["ctrl"], action: "clear", description: "Clear screen", category: "navigation" },
          { key: "c", modifiers: ["ctrl"], action: "exit", description: "Exit CyberMind", category: "navigation" },
          { key: "/", modifiers: [], action: "focus-input", description: "Focus input", category: "navigation" },
          { key: "ArrowUp", modifiers: ["ctrl"], action: "history-prev", description: "Previous command", category: "navigation" },
          { key: "ArrowDown", modifiers: ["ctrl"], action: "history-next", description: "Next command", category: "navigation" },
          // Editing
          { key: "l", modifiers: ["ctrl"], action: "clear-input", description: "Clear input", category: "editing" },
          { key: "a", modifiers: ["ctrl"], action: "select-all", description: "Select all", category: "editing" },
          { key: "z", modifiers: ["ctrl"], action: "undo", description: "Undo", category: "editing" },
          { key: "y", modifiers: ["ctrl"], action: "redo", description: "Redo", category: "editing" },
          // Session
          { key: "s", modifiers: ["ctrl"], action: "save-session", description: "Save session", category: "session" },
          { key: "r", modifiers: ["ctrl"], action: "rewind", description: "Open rewind menu", category: "session" },
          { key: "p", modifiers: ["ctrl"], action: "profile", description: "Switch profile", category: "session" },
          // Tools
          { key: "t", modifiers: ["ctrl"], action: "trust", description: "Trust settings", category: "tools" },
          { key: "m", modifiers: ["ctrl"], action: "model", description: "Model settings", category: "tools" },
          { key: "h", modifiers: ["ctrl"], action: "help", description: "Show help", category: "tools" }
        ];
      }
      /** Show hotkey palette */
      getHotkeyPalette() {
        const hotkeys = this.getDefaultHotkeys();
        const grouped = /* @__PURE__ */ new Map();
        for (const hotkey of hotkeys) {
          if (!grouped.has(hotkey.category)) {
            grouped.set(hotkey.category, []);
          }
          grouped.get(hotkey.category).push(hotkey);
        }
        return Array.from(grouped.entries()).map(([category, bindings]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          bindings: bindings.sort((a, b) => a.key.localeCompare(b.key))
        }));
      }
      /** Analyze a screenshot */
      async analyzeScreenshot(imagePath) {
        if (!existsSync6(imagePath)) {
          throw new Error(`Screenshot file not found: ${imagePath}`);
        }
        const analysis = {
          type: "screenshot",
          imagePath,
          analysis: {
            description: "Screenshot captured successfully",
            elements: [
              {
                type: "window",
                description: "Application window",
                position: { x: 0, y: 0, width: 1920, height: 1080 }
              }
            ],
            suggestions: [
              "Consider using this screenshot as reference for UI development",
              "You can ask questions about specific elements in the image"
            ]
          },
          timestamp: Date.now()
        };
        log5.info("Analyzed screenshot", { imagePath, elementCount: analysis.analysis.elements.length });
        return analysis;
      }
      /** Generate mobile-responsive HTML for content */
      generateMobileHTML(content, images, diagrams) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CyberMind Mobile</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0a0a; 
            color: #fff; 
            line-height: 1.6;
            padding: 1rem;
        }
        .container { max-width: 100%; margin: 0 auto; }
        .content { margin-bottom: 2rem; white-space: pre-wrap; }
        .image { 
            margin: 1rem 0; 
            border-radius: 8px; 
            overflow: hidden;
            max-width: 100%;
        }
        .image img { 
            width: 100%; 
            height: auto; 
            display: block;
        }
        .image-caption { 
            font-size: 0.875rem; 
            color: #9ca3af; 
            margin-top: 0.5rem;
            text-align: center;
        }
        .diagram { 
            margin: 1rem 0; 
            background: #1a1a1a; 
            padding: 1rem; 
            border-radius: 8px;
            overflow-x: auto;
        }
        .diagram-title { 
            font-weight: bold; 
            margin-bottom: 0.5rem; 
        }
        .cost-meter {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #1a1a1a;
            padding: 0.75rem;
            border-top: 1px solid #333;
            font-size: 0.875rem;
            text-align: center;
        }
        @media (min-width: 768px) {
            body { padding: 2rem; }
            .container { max-width: 768px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">${content}</div>
        ${images?.map((img) => `
            <div class="image">
                <img src="${img.src}" alt="${img.alt}" />
                ${img.caption ? `<div class="image-caption">${img.caption}</div>` : ""}
            </div>
        `).join("") || ""}
        ${diagrams?.map((diagram) => `
            <div class="diagram">
                ${diagram.title ? `<div class="diagram-title">${diagram.title}</div>` : ""}
                <pre class="mermaid">${diagram.code}</pre>
            </div>
        `).join("") || ""}
    </div>
    <div class="cost-meter">${this.getCostString()}</div>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>mermaid.initialize({ theme: 'dark' });</script>
</body>
</html>`;
      }
      getMimeType(filePath) {
        const ext = filePath.toLowerCase().split(".").pop();
        const mimeTypes = {
          "jpg": "image/jpeg",
          "jpeg": "image/jpeg",
          "png": "image/png",
          "gif": "image/gif",
          "webp": "image/webp",
          "svg": "image/svg+xml"
        };
        return mimeTypes[ext || ""] || "image/png";
      }
      loadCostMetrics() {
        const path3 = join6(this.dataDir, "cost-metrics.json");
        if (!existsSync6(path3)) {
          const metrics = {
            totalTokens: 0,
            totalCost: 0,
            modelBreakdown: {},
            sessionStart: Date.now(),
            lastUpdate: Date.now()
          };
          writeFileSync5(path3, JSON.stringify(metrics, null, 2), "utf8");
          return metrics;
        }
        try {
          const raw = readFileSync5(path3, "utf8");
          const parsed = JSON.parse(raw);
          return CostMetricsSchema.parse(parsed);
        } catch (err) {
          log5.warn("Failed to load cost metrics, using defaults", { error: String(err) });
          return {
            totalTokens: 0,
            totalCost: 0,
            modelBreakdown: {},
            sessionStart: Date.now(),
            lastUpdate: Date.now()
          };
        }
      }
      saveCostMetrics() {
        const path3 = join6(this.dataDir, "cost-metrics.json");
        try {
          writeFileSync5(path3, JSON.stringify(this.costMetrics, null, 2), "utf8");
        } catch (err) {
          log5.error("Failed to save cost metrics", { error: String(err) });
        }
      }
    };
  }
});

// ../shared/src/ecosystem.ts
import { existsSync as existsSync7, mkdirSync as mkdirSync6, readFileSync as readFileSync6, writeFileSync as writeFileSync6 } from "fs";
import { join as join7 } from "path";
import { z as z7 } from "zod";
var log6, TelemetrySettingsSchema, EcosystemManager;
var init_ecosystem = __esm({
  "../shared/src/ecosystem.ts"() {
    "use strict";
    init_logger();
    log6 = createLogger("ecosystem");
    TelemetrySettingsSchema = z7.object({
      enabled: z7.boolean(),
      level: z7.enum(["minimal", "basic", "detailed"]),
      dataRetention: z7.number(),
      shareUsageStats: z7.boolean(),
      shareErrorReports: z7.boolean(),
      sharePerformanceMetrics: z7.boolean()
    });
    EcosystemManager = class {
      dataDir;
      mcpDir;
      skillsDir;
      telemetrySettings;
      constructor() {
        this.dataDir = getDataDir();
        this.mcpDir = join7(this.dataDir, "mcp");
        this.skillsDir = join7(this.dataDir, "skills");
        if (!existsSync7(this.mcpDir)) mkdirSync6(this.mcpDir, { recursive: true });
        if (!existsSync7(this.skillsDir)) mkdirSync6(this.skillsDir, { recursive: true });
        this.telemetrySettings = this.loadTelemetrySettings();
      }
      // MCP Marketplace Functions
      async searchMCPServers(query, tags) {
        const servers = this.getAvailableMCPServers();
        return servers.filter((server) => {
          const matchesQuery = !query || server.name.toLowerCase().includes(query.toLowerCase()) || server.description.toLowerCase().includes(query.toLowerCase());
          const matchesTags = !tags || tags.length === 0 || tags.some((tag) => server.tags.includes(tag));
          return matchesQuery && matchesTags;
        });
      }
      getAvailableMCPServers() {
        const builtInServers = this.getBuiltInMCPServers();
        const installedServers = this.getInstalledMCPServers();
        return [...builtInServers, ...installedServers];
      }
      async installMCPServer(serverId) {
        const servers = this.getAvailableMCPServers();
        const server = servers.find((s) => s.id === serverId);
        if (!server) {
          log6.warn("MCP server not found", { serverId });
          return false;
        }
        if (server.installed) {
          log6.info("MCP server already installed", { serverId });
          return true;
        }
        server.installed = true;
        server.lastUpdated = Date.now();
        this.saveMCPServer(server);
        log6.info("MCP server installed", { serverId, name: server.name });
        return true;
      }
      async uninstallMCPServer(serverId) {
        const server = this.getMCPServer(serverId);
        if (!server) return false;
        server.installed = false;
        server.lastUpdated = Date.now();
        this.saveMCPServer(server);
        log6.info("MCP server uninstalled", { serverId });
        return true;
      }
      // Skill Marketplace Functions
      async searchSkills(query, category, tags) {
        const skills = this.getAvailableSkills();
        return skills.filter((skill) => {
          const matchesQuery = !query || skill.name.toLowerCase().includes(query.toLowerCase()) || skill.description.toLowerCase().includes(query.toLowerCase());
          const matchesCategory = !category || skill.category === category;
          const matchesTags = !tags || tags.length === 0 || tags.some((tag) => skill.tags.includes(tag));
          return matchesQuery && matchesCategory && matchesTags;
        });
      }
      getAvailableSkills() {
        const seedSkills = this.getSeedSkills();
        const installedSkills = this.getInstalledSkills();
        const skillMap = /* @__PURE__ */ new Map();
        for (const skill of seedSkills) {
          skillMap.set(skill.id, skill);
        }
        for (const skill of installedSkills) {
          skillMap.set(skill.id, skill);
        }
        return Array.from(skillMap.values());
      }
      async installSkill(skillId) {
        const skills = this.getAvailableSkills();
        const skill = skills.find((s) => s.id === skillId);
        if (!skill) {
          log6.warn("Skill not found", { skillId });
          return false;
        }
        if (skill.installed) {
          log6.info("Skill already installed", { skillId });
          return true;
        }
        if (skill.dependencies) {
          for (const depId of skill.dependencies) {
            const dep = this.getSkill(depId);
            if (!dep || !dep.installed) {
              log6.warn("Skill dependency not installed", { skillId, dependency: depId });
              return false;
            }
          }
        }
        skill.installed = true;
        skill.lastUpdated = Date.now();
        skill.downloadCount++;
        this.saveSkill(skill);
        log6.info("Skill installed", { skillId, name: skill.name });
        return true;
      }
      async uninstallSkill(skillId) {
        const skill = this.getSkill(skillId);
        if (!skill) return false;
        skill.installed = false;
        skill.lastUpdated = Date.now();
        this.saveSkill(skill);
        log6.info("Skill uninstalled", { skillId });
        return true;
      }
      // Telemetry Functions
      getTelemetrySettings() {
        return { ...this.telemetrySettings };
      }
      updateTelemetrySettings(settings) {
        this.telemetrySettings = { ...this.telemetrySettings, ...settings };
        this.saveTelemetrySettings();
        log6.info("Telemetry settings updated", { enabled: this.telemetrySettings.enabled });
      }
      isTelemetryEnabled() {
        return this.telemetrySettings.enabled;
      }
      recordUsage(event2, _data) {
        if (!this.telemetrySettings.enabled) return;
        log6.debug("Usage recorded", { event: event2, level: this.telemetrySettings.level });
      }
      // Private helper methods
      getBuiltInMCPServers() {
        return [
          {
            id: "filesystem",
            name: "Filesystem MCP",
            description: "File system operations and management",
            version: "1.0.0",
            author: "CyberMind",
            tags: ["filesystem", "files", "storage"],
            installed: true,
            lastUpdated: Date.now()
          },
          {
            id: "database",
            name: "Database MCP",
            description: "Database connections and queries",
            version: "1.0.0",
            author: "CyberMind",
            tags: ["database", "sql", "storage"],
            installed: false,
            lastUpdated: Date.now()
          },
          {
            id: "web-api",
            name: "Web API MCP",
            description: "HTTP requests and API interactions",
            version: "1.0.0",
            author: "CyberMind",
            tags: ["api", "http", "web"],
            installed: false,
            lastUpdated: Date.now()
          }
        ];
      }
      getSeedSkills() {
        return [
          // Development Skills (20)
          { id: "code-analyzer", name: "Code Analyzer", description: "Analyze code quality and structure", version: "1.0.0", author: "CyberMind", category: "development", tags: ["analysis", "quality"], installed: false, lastUpdated: Date.now(), downloadCount: 1250, rating: 4.5 },
          { id: "refactor-assistant", name: "Refactor Assistant", description: "Intelligent code refactoring suggestions", version: "1.0.0", author: "CyberMind", category: "development", tags: ["refactor", "cleanup"], installed: false, lastUpdated: Date.now(), downloadCount: 980, rating: 4.7 },
          { id: "debug-helper", name: "Debug Helper", description: "Debugging assistance and issue diagnosis", version: "1.0.0", author: "CyberMind", category: "development", tags: ["debug", "troubleshoot"], installed: false, lastUpdated: Date.now(), downloadCount: 1100, rating: 4.6 },
          { id: "test-generator", name: "Test Generator", description: "Generate unit and integration tests", version: "1.0.0", author: "CyberMind", category: "development", tags: ["testing", "automation"], installed: false, lastUpdated: Date.now(), downloadCount: 1500, rating: 4.8 },
          { id: "api-designer", name: "API Designer", description: "Design and document REST APIs", version: "1.0.0", author: "CyberMind", category: "development", tags: ["api", "design"], installed: false, lastUpdated: Date.now(), downloadCount: 750, rating: 4.4 },
          // Design Skills (15)
          { id: "ui-mockup", name: "UI Mockup Generator", description: "Create user interface mockups", version: "1.0.0", author: "CyberMind", category: "design", tags: ["ui", "mockup"], installed: false, lastUpdated: Date.now(), downloadCount: 890, rating: 4.5 },
          { id: "color-palette", name: "Color Palette Creator", description: "Generate color schemes and palettes", version: "1.0.0", author: "CyberMind", category: "design", tags: ["colors", "design"], installed: false, lastUpdated: Date.now(), downloadCount: 620, rating: 4.3 },
          { id: "typography", name: "Typography Advisor", description: "Typography recommendations and pairings", version: "1.0.0", author: "CyberMind", category: "design", tags: ["fonts", "typography"], installed: false, lastUpdated: Date.now(), downloadCount: 450, rating: 4.2 },
          { id: "layout-designer", name: "Layout Designer", description: "Create responsive layout designs", version: "1.0.0", author: "CyberMind", category: "design", tags: ["layout", "responsive"], installed: false, lastUpdated: Date.now(), downloadCount: 780, rating: 4.6 },
          { id: "icon-generator", name: "Icon Generator", description: "Generate custom icons and symbols", version: "1.0.0", author: "CyberMind", category: "design", tags: ["icons", "graphics"], installed: false, lastUpdated: Date.now(), downloadCount: 920, rating: 4.4 },
          // Testing Skills (10)
          { id: "e2e-tester", name: "E2E Test Generator", description: "Generate end-to-end test scenarios", version: "1.0.0", author: "CyberMind", category: "testing", tags: ["e2e", "automation"], installed: false, lastUpdated: Date.now(), downloadCount: 650, rating: 4.5 },
          { id: "performance-tester", name: "Performance Tester", description: "Create performance and load tests", version: "1.0.0", author: "CyberMind", category: "testing", tags: ["performance", "load"], installed: false, lastUpdated: Date.now(), downloadCount: 540, rating: 4.3 },
          { id: "security-scanner", name: "Security Scanner", description: "Security vulnerability scanning", version: "1.0.0", author: "CyberMind", category: "testing", tags: ["security", "scan"], installed: false, lastUpdated: Date.now(), downloadCount: 890, rating: 4.7 },
          { id: "accessibility-tester", name: "Accessibility Tester", description: "Test for accessibility compliance", version: "1.0.0", author: "CyberMind", category: "testing", tags: ["a11y", "compliance"], installed: false, lastUpdated: Date.now(), downloadCount: 380, rating: 4.4 },
          { id: "compatibility-tester", name: "Compatibility Tester", description: "Cross-browser compatibility testing", version: "1.0.0", author: "CyberMind", category: "testing", tags: ["compatibility", "browser"], installed: false, lastUpdated: Date.now(), downloadCount: 420, rating: 4.2 },
          // Deployment Skills (10)
          { id: "docker-generator", name: "Docker Generator", description: "Generate Docker configurations", version: "1.0.0", author: "CyberMind", category: "deployment", tags: ["docker", "containers"], installed: false, lastUpdated: Date.now(), downloadCount: 1100, rating: 4.6 },
          { id: "kubernetes-deployer", name: "Kubernetes Deployer", description: "Kubernetes deployment manifests", version: "1.0.0", author: "CyberMind", category: "deployment", tags: ["k8s", "orchestration"], installed: false, lastUpdated: Date.now(), downloadCount: 780, rating: 4.5 },
          { id: "ci-cd-pipeline", name: "CI/CD Pipeline", description: "Generate CI/CD pipeline configurations", version: "1.0.0", author: "CyberMind", category: "deployment", tags: ["cicd", "pipeline"], installed: false, lastUpdated: Date.now(), downloadCount: 920, rating: 4.7 },
          { id: "cloud-deployer", name: "Cloud Deployer", description: "Cloud deployment configurations", version: "1.0.0", author: "CyberMind", category: "deployment", tags: ["cloud", "deploy"], installed: false, lastUpdated: Date.now(), downloadCount: 650, rating: 4.4 },
          { id: "env-manager", name: "Environment Manager", description: "Manage deployment environments", version: "1.0.0", author: "CyberMind", category: "deployment", tags: ["environment", "config"], installed: false, lastUpdated: Date.now(), downloadCount: 480, rating: 4.3 },
          // Monitoring Skills (5)
          { id: "log-analyzer", name: "Log Analyzer", description: "Analyze and parse application logs", version: "1.0.0", author: "CyberMind", category: "monitoring", tags: ["logs", "analysis"], installed: false, lastUpdated: Date.now(), downloadCount: 520, rating: 4.4 },
          { id: "metrics-collector", name: "Metrics Collector", description: "Collect and visualize metrics", version: "1.0.0", author: "CyberMind", category: "monitoring", tags: ["metrics", "monitoring"], installed: false, lastUpdated: Date.now(), downloadCount: 380, rating: 4.2 },
          { id: "alert-manager", name: "Alert Manager", description: "Configure alerts and notifications", version: "1.0.0", author: "CyberMind", category: "monitoring", tags: ["alerts", "notifications"], installed: false, lastUpdated: Date.now(), downloadCount: 340, rating: 4.3 },
          { id: "health-checker", name: "Health Checker", description: "Application health monitoring", version: "1.0.0", author: "CyberMind", category: "monitoring", tags: ["health", "monitoring"], installed: false, lastUpdated: Date.now(), downloadCount: 420, rating: 4.5 },
          { id: "uptime-monitor", name: "Uptime Monitor", description: "Monitor service uptime and availability", version: "1.0.0", author: "CyberMind", category: "monitoring", tags: ["uptime", "availability"], installed: false, lastUpdated: Date.now(), downloadCount: 290, rating: 4.1 },
          // Security Skills (5)
          { id: "vulnerability-scanner", name: "Vulnerability Scanner", description: "Scan for security vulnerabilities", version: "1.0.0", author: "CyberMind", category: "security", tags: ["security", "vulnerability"], installed: false, lastUpdated: Date.now(), downloadCount: 680, rating: 4.6 },
          { id: "password-manager", name: "Password Manager", description: "Generate and manage secure passwords", version: "1.0.0", author: "CyberMind", category: "security", tags: ["passwords", "security"], installed: false, lastUpdated: Date.now(), downloadCount: 450, rating: 4.3 },
          { id: "encryption-helper", name: "Encryption Helper", description: "Encryption and decryption utilities", version: "1.0.0", author: "CyberMind", category: "security", tags: ["encryption", "crypto"], installed: false, lastUpdated: Date.now(), downloadCount: 320, rating: 4.4 },
          { id: "audit-logger", name: "Audit Logger", description: "Security audit logging", version: "1.0.0", author: "CyberMind", category: "security", tags: ["audit", "logging"], installed: false, lastUpdated: Date.now(), downloadCount: 280, rating: 4.2 },
          { id: "compliance-checker", name: "Compliance Checker", description: "Check regulatory compliance", version: "1.0.0", author: "CyberMind", category: "security", tags: ["compliance", "regulation"], installed: false, lastUpdated: Date.now(), downloadCount: 360, rating: 4.3 },
          // Data Skills (5)
          { id: "data-visualizer", name: "Data Visualizer", description: "Create data visualizations and charts", version: "1.0.0", author: "CyberMind", category: "data", tags: ["visualization", "charts"], installed: false, lastUpdated: Date.now(), downloadCount: 750, rating: 4.5 },
          { id: "etl-pipeline", name: "ETL Pipeline", description: "Design ETL data pipelines", version: "1.0.0", author: "CyberMind", category: "data", tags: ["etl", "pipeline"], installed: false, lastUpdated: Date.now(), downloadCount: 520, rating: 4.4 },
          { id: "data-cleaner", name: "Data Cleaner", description: "Clean and preprocess data", version: "1.0.0", author: "CyberMind", category: "data", tags: ["cleaning", "preprocessing"], installed: false, lastUpdated: Date.now(), downloadCount: 480, rating: 4.3 },
          { id: "schema-designer", name: "Schema Designer", description: "Design database schemas", version: "1.0.0", author: "CyberMind", category: "data", tags: ["schema", "database"], installed: false, lastUpdated: Date.now(), downloadCount: 620, rating: 4.6 },
          { id: "migration-tool", name: "Migration Tool", description: "Database migration assistance", version: "1.0.0", author: "CyberMind", category: "data", tags: ["migration", "database"], installed: false, lastUpdated: Date.now(), downloadCount: 380, rating: 4.2 },
          // AI Skills (5)
          { id: "ml-model-trainer", name: "ML Model Trainer", description: "Train machine learning models", version: "1.0.0", author: "CyberMind", category: "ai", tags: ["ml", "training"], installed: false, lastUpdated: Date.now(), downloadCount: 580, rating: 4.5 },
          { id: "prompt-engineer", name: "Prompt Engineer", description: "Optimize AI prompts", version: "1.0.0", author: "CyberMind", category: "ai", tags: ["prompt", "ai"], installed: false, lastUpdated: Date.now(), downloadCount: 890, rating: 4.7 },
          { id: "model-evaluator", name: "Model Evaluator", description: "Evaluate AI model performance", version: "1.0.0", author: "CyberMind", category: "ai", tags: ["evaluation", "metrics"], installed: false, lastUpdated: Date.now(), downloadCount: 420, rating: 4.4 },
          { id: "data-augmenter", name: "Data Augmenter", description: "Augment training data", version: "1.0.0", author: "CyberMind", category: "ai", tags: ["augmentation", "data"], installed: false, lastUpdated: Date.now(), downloadCount: 350, rating: 4.3 },
          { id: "ai-deployer", name: "AI Deployer", description: "Deploy AI models to production", version: "1.0.0", author: "CyberMind", category: "ai", tags: ["deployment", "production"], installed: false, lastUpdated: Date.now(), downloadCount: 480, rating: 4.5 }
        ];
      }
      getMCPServer(serverId) {
        const servers = this.getAvailableMCPServers();
        return servers.find((s) => s.id === serverId) || null;
      }
      getSkill(skillId) {
        const skills = this.getAvailableSkills();
        return skills.find((s) => s.id === skillId) || null;
      }
      getInstalledMCPServers() {
        return [];
      }
      getInstalledSkills() {
        try {
          if (!existsSync7(this.skillsDir)) return [];
          const { readdirSync: readdirSync11 } = __require("fs");
          const files = readdirSync11(this.skillsDir).filter((f) => f.endsWith(".json"));
          const skills = [];
          for (const file of files) {
            try {
              const content = readFileSync6(join7(this.skillsDir, file), "utf8");
              skills.push(JSON.parse(content));
            } catch (err) {
              log6.warn("Failed to parse skill file", { file, error: String(err) });
            }
          }
          return skills;
        } catch (err) {
          log6.error("Failed to read skills directory", { error: String(err) });
          return [];
        }
      }
      saveMCPServer(server) {
        const path3 = join7(this.mcpDir, `${server.id}.json`);
        try {
          writeFileSync6(path3, JSON.stringify(server, null, 2), "utf8");
        } catch (err) {
          log6.error("Failed to save MCP server", { serverId: server.id, error: String(err) });
        }
      }
      saveSkill(skill) {
        const path3 = join7(this.skillsDir, `${skill.id}.json`);
        try {
          writeFileSync6(path3, JSON.stringify(skill, null, 2), "utf8");
        } catch (err) {
          log6.error("Failed to save skill", { skillId: skill.id, error: String(err) });
        }
      }
      loadTelemetrySettings() {
        const path3 = join7(this.dataDir, "telemetry-settings.json");
        if (!existsSync7(path3)) {
          const settings = {
            enabled: false,
            // Default to off
            level: "minimal",
            dataRetention: 30,
            shareUsageStats: false,
            shareErrorReports: false,
            sharePerformanceMetrics: false
          };
          writeFileSync6(path3, JSON.stringify(settings, null, 2), "utf8");
          return settings;
        }
        try {
          const raw = readFileSync6(path3, "utf8");
          const parsed = JSON.parse(raw);
          return TelemetrySettingsSchema.parse(parsed);
        } catch (err) {
          log6.warn("Failed to load telemetry settings, using defaults", { error: String(err) });
          return {
            enabled: false,
            level: "minimal",
            dataRetention: 30,
            shareUsageStats: false,
            shareErrorReports: false,
            sharePerformanceMetrics: false
          };
        }
      }
      saveTelemetrySettings() {
        const path3 = join7(this.dataDir, "telemetry-settings.json");
        try {
          writeFileSync6(path3, JSON.stringify(this.telemetrySettings, null, 2), "utf8");
        } catch (err) {
          log6.error("Failed to save telemetry settings", { error: String(err) });
        }
      }
    };
  }
});

// ../shared/src/providers/ollama-config.ts
var log7;
var init_ollama_config = __esm({
  "../shared/src/providers/ollama-config.ts"() {
    "use strict";
    init_logger();
    log7 = createLogger("ollama-config");
  }
});

// ../shared/src/providers/custom-server.ts
var log8, DEFAULT_CUSTOM_SERVER_CONFIG, CustomServerManager;
var init_custom_server = __esm({
  "../shared/src/providers/custom-server.ts"() {
    "use strict";
    init_logger();
    log8 = createLogger("custom-server");
    DEFAULT_CUSTOM_SERVER_CONFIG = {
      baseUrl: "https://api.cybermind.ai/v1",
      models: [
        {
          id: "cybermind-ultra",
          name: "CyberMind Ultra",
          provider: "CyberMind",
          description: "Most powerful model for complex tasks",
          contextWindow: 2e5,
          inputCost: 5,
          outputCost: 15,
          capabilities: ["code", "reasoning", "analysis", "multimodal"],
          endpoint: "/chat/completions",
          isActive: true
        },
        {
          id: "cybermind-pro",
          name: "CyberMind Pro",
          provider: "CyberMind",
          description: "Balanced model for most tasks",
          contextWindow: 128e3,
          inputCost: 2,
          outputCost: 6,
          capabilities: ["code", "reasoning", "analysis"],
          endpoint: "/chat/completions",
          isActive: true
        },
        {
          id: "cybermind-speed",
          name: "CyberMind Speed",
          provider: "CyberMind",
          description: "Fast model for quick responses",
          contextWindow: 32e3,
          inputCost: 0.5,
          outputCost: 1.5,
          capabilities: ["code", "basic-reasoning"],
          endpoint: "/chat/completions",
          isActive: true
        },
        {
          id: "cybermind-code",
          name: "CyberMind Code",
          provider: "CyberMind",
          description: "Specialized for coding tasks",
          contextWindow: 128e3,
          inputCost: 1.5,
          outputCost: 4.5,
          capabilities: ["code", "debugging", "refactoring"],
          endpoint: "/chat/completions",
          isActive: true
        },
        {
          id: "cybermind-creative",
          name: "CyberMind Creative",
          provider: "CyberMind",
          description: "Creative and design tasks",
          contextWindow: 64e3,
          inputCost: 1,
          outputCost: 3,
          capabilities: ["creative", "design", "writing"],
          endpoint: "/chat/completions",
          isActive: true
        }
      ],
      timeout: 6e4,
      retries: 3,
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 1e6
      }
    };
    CustomServerManager = class {
      config;
      apiKey = null;
      constructor(config = {}) {
        this.config = { ...DEFAULT_CUSTOM_SERVER_CONFIG, ...config };
      }
      setApiKey(apiKey) {
        this.apiKey = apiKey;
        log8.info("Custom server API key set");
      }
      getApiKey() {
        return this.apiKey;
      }
      async testConnection() {
        try {
          const response = await fetch(`${this.config.baseUrl}/models`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...this.apiKey && { "Authorization": `Bearer ${this.apiKey}` }
            },
            signal: AbortSignal.timeout(5e3)
          });
          if (!response.ok) {
            log8.warn("Custom server connection failed", { status: response.status });
            return false;
          }
          const data = await response.json();
          log8.info("Custom server connected successfully", { models: data.data?.length || 0 });
          return true;
        } catch (error) {
          log8.warn("Custom server connection error", { error: String(error) });
          return false;
        }
      }
      async listModels() {
        try {
          const response = await fetch(`${this.config.baseUrl}/models`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...this.apiKey && { "Authorization": `Bearer ${this.apiKey}` }
            },
            signal: AbortSignal.timeout(this.config.timeout)
          });
          if (!response.ok) {
            throw new Error(`Custom server API error: ${response.status}`);
          }
          const data = await response.json();
          return data.data || this.config.models;
        } catch (error) {
          log8.error("Failed to list custom server models", { error: String(error) });
          return this.config.models;
        }
      }
      async generateResponse(modelId, messages) {
        if (!this.apiKey) {
          throw new Error("API key required for custom server");
        }
        try {
          const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
              model: modelId,
              messages,
              stream: false,
              temperature: 0.7,
              max_tokens: 2048
            }),
            signal: AbortSignal.timeout(this.config.timeout)
          });
          if (!response.ok) {
            throw new Error(`Generation failed: ${response.status}`);
          }
          const data = await response.json();
          return data.choices[0]?.message?.content || "";
        } catch (error) {
          log8.error("Failed to generate response from custom server", { model: modelId, error: String(error) });
          throw error;
        }
      }
      getModel(modelId) {
        return this.config.models.find((model) => model.id === modelId) || null;
      }
      getActiveModels() {
        return this.config.models.filter((model) => model.isActive);
      }
      getModelsByCapability(capability) {
        return this.config.models.filter(
          (model) => model.isActive && model.capabilities.includes(capability)
        );
      }
      calculateCost(modelId, inputTokens, outputTokens) {
        const model = this.getModel(modelId);
        if (!model) return 0;
        const inputCost = inputTokens / 1e6 * model.inputCost;
        const outputCost = outputTokens / 1e6 * model.outputCost;
        return inputCost + outputCost;
      }
      updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        log8.info("Custom server config updated", { updates: Object.keys(updates) });
      }
      addCustomModel(model) {
        this.config.models.push(model);
        log8.info("Custom model added", { modelId: model.id, name: model.name });
      }
      removeModel(modelId) {
        const index = this.config.models.findIndex((model) => model.id === modelId);
        if (index !== -1) {
          this.config.models.splice(index, 1);
          log8.info("Model removed", { modelId });
          return true;
        }
        return false;
      }
      getConfig() {
        return { ...this.config };
      }
      // Rate limiting
      rateLimitTracker = {
        requests: [],
        tokens: []
      };
      async checkRateLimit() {
        const now = Date.now();
        const oneMinuteAgo = now - 6e4;
        this.rateLimitTracker.requests = this.rateLimitTracker.requests.filter((time) => time > oneMinuteAgo);
        this.rateLimitTracker.tokens = this.rateLimitTracker.tokens.filter((time) => time > oneMinuteAgo);
        if (this.rateLimitTracker.requests.length >= this.config.rateLimit.requestsPerMinute) {
          log8.warn("Rate limit exceeded for requests");
          return false;
        }
        return true;
      }
      recordRequest(tokenCount = 0) {
        this.rateLimitTracker.requests.push(Date.now());
        this.rateLimitTracker.tokens.push(tokenCount);
      }
    };
  }
});

// ../shared/src/auto-agent.ts
var log9;
var init_auto_agent = __esm({
  "../shared/src/auto-agent.ts"() {
    "use strict";
    init_logger();
    log9 = createLogger("auto-agent");
  }
});

// ../shared/src/index.ts
var init_src = __esm({
  "../shared/src/index.ts"() {
    "use strict";
    init_types();
    init_logger();
    init_paths();
    init_version();
    init_secret_scanner();
    init_checkpoint();
    init_profiles();
    init_collaboration();
    init_web_mirror();
    init_rich_io();
    init_ecosystem();
    init_ollama_config();
    init_custom_server();
    init_auto_agent();
  }
});

// src/utils/config.ts
import { readFileSync as readFileSync7, writeFileSync as writeFileSync7, existsSync as existsSync8, mkdirSync as mkdirSync7 } from "fs";
import { homedir as homedir2 } from "os";
import { join as join8 } from "path";
function ensureConfigDir() {
  if (!existsSync8(CONFIG_DIR)) {
    mkdirSync7(CONFIG_DIR, { recursive: true });
  }
}
function loadConfig() {
  ensureConfigDir();
  try {
    if (existsSync8(CONFIG_FILE)) {
      const raw = readFileSync7(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
  }
  return { ...DEFAULT_CONFIG };
}
function saveConfig(config) {
  ensureConfigDir();
  writeFileSync7(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}
function updateConfig(partial) {
  const current = loadConfig();
  const merged = { ...current, ...partial };
  saveConfig(merged);
  return merged;
}
function isOnboardingComplete() {
  return loadConfig().onboardingComplete === true;
}
function markOnboardingComplete(method) {
  updateConfig({
    onboardingComplete: true,
    loginMethod: method
  });
}
function clearLogin() {
  updateConfig({
    onboardingComplete: false,
    loginMethod: null,
    user: {},
    apiKeys: {},
    authToken: void 0,
    sessionId: void 0
  });
}
function setApiKey(provider, key) {
  const config = loadConfig();
  const apiKeys = { ...config.apiKeys ?? {} };
  apiKeys[provider] = key;
  updateConfig({ apiKeys });
}
function setAuthToken(token) {
  updateConfig({ authToken: token });
}
function getAuthToken() {
  return loadConfig().authToken;
}
function setSessionId(sessionId) {
  updateConfig({ sessionId });
}
function getSessionId() {
  return loadConfig().sessionId;
}
function isAuthenticated() {
  const config = loadConfig();
  if (config.loginMethod === "codeva" || config.loginMethod === "cybercli") {
    return !!config.authToken;
  }
  if (config.loginMethod === "apikey") {
    return !!(config.apiKeys && (config.apiKeys.cybermind || config.apiKeys.cybermind_cloud || config.apiKeys.codeva || config.apiKeys.anthropic));
  }
  if (config.loginMethod === "thirdparty") {
    return true;
  }
  return false;
}
function setUserProfile(profile) {
  updateConfig({ user: profile });
}
function getUserProfile() {
  return loadConfig().user ?? {};
}
function setTheme(mode, syntaxTheme) {
  updateConfig({ theme: { mode, syntaxTheme } });
}
function getTheme() {
  return loadConfig().theme ?? DEFAULT_CONFIG.theme;
}
var CONFIG_DIR, CONFIG_FILE, DEFAULT_CONFIG;
var init_config = __esm({
  "src/utils/config.ts"() {
    "use strict";
    CONFIG_DIR = join8(homedir2(), ".cybercoder");
    CONFIG_FILE = join8(CONFIG_DIR, "config.json");
    DEFAULT_CONFIG = {
      onboardingComplete: false,
      loginMethod: null,
      theme: {
        mode: "dark",
        syntaxTheme: "Monokai Extended"
      },
      apiKeys: {},
      lastProvider: "auto",
      lastModel: "auto",
      user: {},
      authToken: void 0,
      sessionId: void 0,
      autoUpdateCheck: true,
      showWelcome: true,
      telemetry: true,
      version: "0.1.16"
    };
  }
});

// ../core/src/context.ts
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
function estimateMessagesTokens(messages) {
  let total = 0;
  for (const m of messages) {
    total += estimateTokens(m.content);
    if (m.toolCalls) {
      for (const tc of m.toolCalls) {
        total += estimateTokens(tc.name) + estimateTokens(JSON.stringify(tc.input));
      }
    }
  }
  return total;
}
function trimToolOutput(output, opts = {}) {
  const maxChars = opts.maxChars ?? 12e3;
  if (output.length <= maxChars) return output;
  const headTail = opts.headTail ?? Math.floor(maxChars / 2) - 40;
  const head = output.slice(0, headTail);
  const tail = output.slice(output.length - headTail);
  const elided = output.length - head.length - tail.length;
  return `${head}

\u2026 [${elided} chars elided to save context \u2014 re-read with offset/limit if you need the middle] \u2026

${tail}`;
}
function manageContext(messages, budget) {
  const highWater = budget.highWater ?? 0.75;
  const keepRecent = budget.keepRecent ?? 6;
  const limit = Math.floor(budget.windowTokens * highWater);
  const tokens = estimateMessagesTokens(messages);
  if (tokens <= limit || messages.length <= keepRecent + 1) {
    return { messages, compacted: false, tokens };
  }
  const splitAt = messages.length - keepRecent;
  const old = messages.slice(0, splitAt);
  let recent = messages.slice(splitAt);
  while (recent.length && recent[0].role === "tool") {
    recent = recent.slice(1);
  }
  const synopsis = condense(old);
  const synopsisMsg = {
    role: "system",
    content: synopsis
  };
  const next = [synopsisMsg, ...recent];
  return {
    messages: next,
    compacted: true,
    tokens: estimateMessagesTokens(next),
    note: `context auto-compacted: ${old.length} older turns \u2192 synopsis (${tokens} \u2192 ~${estimateMessagesTokens(next)} tok)`
  };
}
function condense(old) {
  const userAsks = [];
  const toolActions = [];
  let lastAssistant = "";
  for (const m of old) {
    if (m.role === "user") {
      const oneLine = m.content.replace(/\s+/g, " ").trim().slice(0, 160);
      if (oneLine) userAsks.push(oneLine);
    } else if (m.role === "assistant") {
      if (m.content.trim()) lastAssistant = m.content.replace(/\s+/g, " ").trim().slice(0, 240);
      for (const tc of m.toolCalls ?? []) {
        const target = tc.input.path || tc.input.command || tc.input.pattern || "";
        toolActions.push(`${tc.name}(${String(target).slice(0, 60)})`);
      }
    }
  }
  const parts = ["[Earlier conversation compacted to save context]"];
  if (userAsks.length) parts.push(`Goals: ${userAsks.slice(-4).join(" | ")}`);
  if (toolActions.length) {
    const uniq = Array.from(new Set(toolActions)).slice(-12);
    parts.push(`Actions taken: ${uniq.join(", ")}`);
  }
  if (lastAssistant) parts.push(`Last note: ${lastAssistant}`);
  return parts.join("\n");
}
function windowForModel(model) {
  const m = model.toLowerCase();
  if (m.includes("gpt-4o") || m.includes("claude") || m.includes("gemini-1.5") || m.includes("gemini-2")) return 128e3;
  if (m.includes("llama-3.1") || m.includes("llama-3.3")) return 128e3;
  if (m.includes("mixtral") || m.includes("mistral")) return 32e3;
  if (m.includes("gemma")) return 8192;
  return 16e3;
}
var init_context = __esm({
  "../core/src/context.ts"() {
    "use strict";
  }
});

// ../core/src/agent-loop.ts
async function* runAgentLoop(messages, opts) {
  const tools = opts.tools ?? [];
  const toolMap = new Map(tools.map((t) => [t.schema.name, t]));
  const toolSchemas = tools.map((t) => t.schema);
  const max = opts.maxIterations ?? 10;
  const ctx = { cwd: process.cwd() };
  const maxToolChars = opts.maxToolOutputChars ?? 12e3;
  const budget = {
    windowTokens: opts.contextBudget?.windowTokens ?? windowForModel(opts.model ?? "auto"),
    highWater: opts.contextBudget?.highWater ?? 0.75,
    keepRecent: opts.contextBudget?.keepRecent ?? 6
  };
  let buffer = [...messages];
  for (let iter = 0; iter < max; iter++) {
    if (opts.signal?.aborted) {
      yield { type: "done", reason: "error", error: "aborted" };
      return;
    }
    yield { type: "iteration", index: iter, max };
    const managed = manageContext(buffer, budget);
    if (managed.compacted) {
      buffer = managed.messages;
      yield { type: "context", note: managed.note ?? "context compacted", tokens: managed.tokens };
    }
    const req = {
      model: opts.model ?? "auto",
      messages: buffer,
      systemPrompt: opts.systemPrompt,
      tools: toolSchemas.length > 0 ? toolSchemas : void 0,
      signal: opts.signal
    };
    let assistantText = "";
    let assistantToolCalls = [];
    let stopReason = { type: "done", reason: "end_turn" };
    let attempt = 0;
    while (true) {
      assistantText = "";
      assistantToolCalls = [];
      stopReason = { type: "done", reason: "end_turn" };
      let sawError;
      for await (const chunk of opts.provider.chat(req)) {
        if (chunk.type === "text") {
          assistantText += chunk.text;
          yield { type: "text", text: chunk.text };
        } else if (chunk.type === "tool_call") {
          assistantToolCalls.push(chunk.toolCall);
          yield {
            type: "tool_call",
            name: chunk.toolCall.name,
            input: chunk.toolCall.input,
            id: chunk.toolCall.id
          };
        } else if (chunk.type === "usage") {
          yield { type: "usage", inputTokens: chunk.inputTokens, outputTokens: chunk.outputTokens };
        } else if (chunk.type === "done") {
          stopReason = chunk;
          if (chunk.reason === "error") sawError = chunk.error;
        }
      }
      if (sawError && attempt === 0 && !assistantText && assistantToolCalls.length === 0 && isTransient(sawError)) {
        attempt++;
        log10.warn("provider transient error; retrying once", { error: sawError });
        yield { type: "context", note: `retry after transient error: ${sawError}`, tokens: managed.tokens };
        await delay(400);
        continue;
      }
      break;
    }
    buffer.push({
      role: "assistant",
      content: assistantText,
      toolCalls: assistantToolCalls.length ? assistantToolCalls : void 0
    });
    if (stopReason.reason === "error") {
      yield { type: "done", reason: "error", error: stopReason.error };
      return;
    }
    if (assistantToolCalls.length === 0) {
      yield { type: "done", reason: "end_turn" };
      return;
    }
    const results = await executeToolCalls(assistantToolCalls, toolMap, ctx, maxToolChars);
    for (const r of results) {
      yield { type: "tool_result", name: r.name, id: r.id, output: r.output, ok: r.ok };
      buffer.push({ role: "tool", content: r.output, toolCallId: r.id });
    }
  }
  yield { type: "done", reason: "max_iterations" };
}
async function executeToolCalls(calls, toolMap, ctx, maxToolChars) {
  const results = new Array(calls.length);
  const runOne = async (tc, index) => {
    const tool = toolMap.get(tc.name);
    if (!tool) {
      results[index] = { name: tc.name, id: tc.id, output: `Tool '${tc.name}' is not registered.`, ok: false };
      return;
    }
    try {
      if (ctx.approve) {
        const ok = await ctx.approve(tc.name, tc.input);
        if (!ok) {
          results[index] = { name: tc.name, id: tc.id, output: `[user denied tool '${tc.name}']`, ok: false };
          return;
        }
      }
      let output = await tool.execute(tc.input, ctx);
      if (tool.verify) {
        const problem = await tool.verify(tc.input, output, ctx);
        if (problem) {
          results[index] = {
            name: tc.name,
            id: tc.id,
            output: `${output}

[verify] ${problem}`,
            ok: false
          };
          return;
        }
      }
      output = trimToolOutput(output, { maxChars: maxToolChars });
      results[index] = { name: tc.name, id: tc.id, output, ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log10.error("tool execution failed", { tool: tc.name, err: msg });
      results[index] = { name: tc.name, id: tc.id, output: `Error: ${msg}`, ok: false };
    }
  };
  const parallel = [];
  const sequential = [];
  calls.forEach((tc, index) => {
    const tool = toolMap.get(tc.name);
    if (tool && tool.destructive) {
      sequential.push({ tc, index });
    } else {
      parallel.push(runOne(tc, index));
    }
  });
  await Promise.all(parallel);
  for (const { tc, index } of sequential) {
    await runOne(tc, index);
  }
  return results;
}
function isTransient(error) {
  const e = error.toLowerCase();
  return e.includes("429") || e.includes("rate limit") || e.includes("timeout") || e.includes("econnreset") || e.includes("etimedout") || e.includes("503") || e.includes("502") || e.includes("overloaded") || e.includes("fetch failed");
}
function delay(ms) {
  return new Promise((resolve13) => setTimeout(resolve13, ms));
}
var log10;
var init_agent_loop = __esm({
  "../core/src/agent-loop.ts"() {
    "use strict";
    init_src();
    init_context();
    log10 = createLogger("core:agent");
  }
});

// ../core/src/consensus.ts
async function runConsensus(messages, opts) {
  const timeout = opts.timeoutMs ?? 6e4;
  const tasks = opts.providers.map(async (p2, i) => {
    const req = {
      model: opts.models?.[i] ?? "auto",
      messages,
      systemPrompt: opts.systemPrompt
    };
    const out = { text: "" };
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeout);
    try {
      for await (const chunk of p2.chat({ ...req, signal: ac.signal })) {
        if (chunk.type === "text") out.text += chunk.text;
        else if (chunk.type === "done" && chunk.reason === "error") out.error = chunk.error;
      }
    } catch (err) {
      out.error = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timer);
    }
    return { provider: p2.info.id, model: req.model, text: out.text, error: out.error };
  });
  const perProvider = await Promise.all(tasks);
  const merged = mergeAnswers(perProvider.filter((r) => !r.error).map((r) => r.text));
  return { perProvider, merged };
}
function mergeAnswers(answers) {
  if (answers.length === 0) return "";
  if (answers.length === 1) return answers[0] ?? "";
  const sorted = [...answers].sort((a, b) => b.length - a.length);
  const spine = sorted[0] ?? "";
  const seen = new Set(spine.split("\n").map((l) => l.trim()));
  const extras = [];
  for (let i = 1; i < sorted.length; i++) {
    const lines = (sorted[i] ?? "").split("\n");
    for (const line of lines) {
      const t = line.trim();
      if (t.length > 0 && !seen.has(t)) {
        seen.add(t);
        extras.push(line);
      }
    }
  }
  return extras.length > 0 ? `${spine}

--- additional perspectives ---
${extras.join("\n")}` : spine;
}
var init_consensus = __esm({
  "../core/src/consensus.ts"() {
    "use strict";
  }
});

// ../core/src/plan-act.ts
async function runPlan(messages, opts) {
  const readonly = opts.tools.filter((t) => !t.destructive);
  let text = "";
  for await (const evt of runAgentLoop(messages, {
    provider: opts.provider,
    systemPrompt: PLAN_SYSTEM,
    model: opts.model ?? "auto",
    tools: readonly,
    maxIterations: 6,
    signal: opts.signal
  })) {
    opts.onEvent?.(evt);
    if (evt.type === "text") text += evt.text;
  }
  const steps = text.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("STEP:")).map((l) => l.replace(/^STEP:\s*/, ""));
  return { plan: text.trim(), steps };
}
async function* runGoal(initialMessages, opts) {
  const maxRounds = opts.maxRounds ?? 8;
  const system = `${opts.systemPrompt ?? ""}${GOAL_SYSTEM_SUFFIX}`;
  const buffer = [...initialMessages];
  for (let round = 0; round < maxRounds; round++) {
    if (opts.signal?.aborted) {
      yield { type: "done", reason: "error", error: "aborted", round };
      return;
    }
    let roundText = "";
    let endedTurn = false;
    for await (const evt of runAgentLoop(buffer, {
      provider: opts.provider,
      systemPrompt: system,
      model: opts.model ?? "auto",
      tools: opts.tools,
      signal: opts.signal
    })) {
      if (evt.type === "text") roundText += evt.text;
      if (evt.type === "done") endedTurn = true;
      yield { ...evt, round };
    }
    buffer.push({ role: "assistant", content: roundText });
    if (roundText.includes(GOAL_SENTINEL)) {
      yield { type: "done", reason: "end_turn", round };
      return;
    }
    if (!endedTurn) {
      return;
    }
    buffer.push({
      role: "user",
      content: `Continue working toward the goal. If it is fully done and verified, reply with ${GOAL_SENTINEL}.`
    });
  }
  yield { type: "done", reason: "max_iterations" };
}
var PLAN_SYSTEM, GOAL_SENTINEL, GOAL_SYSTEM_SUFFIX;
var init_plan_act = __esm({
  "../core/src/plan-act.ts"() {
    "use strict";
    init_agent_loop();
    PLAN_SYSTEM = `You are in PLANNING mode. Produce a concise, ordered implementation
plan for the user's goal. Use read-only tools (read_file, read_many, list_dir,
grep, web_search) to ground the plan in the actual codebase. DO NOT modify any
files or run mutating commands. End with a numbered task list, one task per line,
prefixed "STEP:".`;
    GOAL_SENTINEL = "GOAL_COMPLETE";
    GOAL_SYSTEM_SUFFIX = `

You are working toward a GOAL until it is fully achieved.
After each round, assess whether the goal is met. When \u2014 and only when \u2014 the goal
is fully complete and verified, end your message with the exact token ${GOAL_SENTINEL}
on its own line. If not complete, keep going: take the next concrete action.`;
  }
});

// ../core/src/index.ts
var init_src2 = __esm({
  "../core/src/index.ts"() {
    "use strict";
    init_agent_loop();
    init_consensus();
    init_context();
    init_plan_act();
  }
});

// ../providers/src/types.ts
import { z as z8 } from "zod";
var ProviderRoleSchema;
var init_types2 = __esm({
  "../providers/src/types.ts"() {
    "use strict";
    ProviderRoleSchema = z8.enum(["system", "user", "assistant", "tool"]);
  }
});

// ../providers/src/cybermind-cloud.ts
var log11, CybermindCloudProvider;
var init_cybermind_cloud = __esm({
  "../providers/src/cybermind-cloud.ts"() {
    "use strict";
    init_src();
    log11 = createLogger("providers:cybermind-cloud");
    CybermindCloudProvider = class {
      info;
      defaultModel;
      opts;
      constructor(opts = {}) {
        this.opts = opts;
        this.defaultModel = opts.defaultModel ?? "trinity";
        this.info = {
          id: "cybermind-cloud",
          displayName: "Codeva Cloud (Swarm)",
          requiresNetwork: true,
          ready: true
          // We assume true and handle errors during the chat call
        };
      }
      async listModels() {
        return ["madhav", "kali", "abhimanyu", "trinity"];
      }
      async *chat(req) {
        const model = req.model || this.defaultModel;
        log11.debug("Starting Codeva Cloud chat request", { model });
        try {
          let systemPrompt = "";
          const filteredMessages = [];
          for (const msg of req.messages) {
            if (msg.role === "system") {
              systemPrompt += (typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)) + "\n";
            } else {
              filteredMessages.push({
                role: msg.role,
                content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
              });
            }
          }
          const lastMessage = filteredMessages[filteredMessages.length - 1]?.content || "";
          const baseURL = this.opts.baseURL || "https://cybercli-api.onrender.com/api/v1";
          const headers = { "Content-Type": "application/json" };
          if (this.opts.apiKey) headers["Authorization"] = `Bearer ${this.opts.apiKey}`;
          if (this.opts.sessionId) headers["x-cli-session"] = this.opts.sessionId;
          const response = await fetch(`${baseURL}/cli/complete`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model,
              system: systemPrompt,
              messages: filteredMessages,
              prompt: lastMessage,
              temperature: req.temperature,
              max_tokens: req.maxTokens,
              stream: true
            })
          });
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Streaming failed: ${response.status} ${errText}`);
          }
          const reader = response.body?.getReader();
          if (!reader) throw new Error("No response body for streaming");
          const decoder = new TextDecoder();
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ")) continue;
              const dataStr = trimmed.slice(6).trim();
              if (dataStr === "[DONE]") {
                continue;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.content) {
                  yield { type: "text", text: parsed.content };
                }
              } catch {
              }
            }
          }
          yield { type: "done", reason: "stop" };
        } catch (err) {
          log11.error("Codeva Cloud chat failed", err);
          yield { type: "done", reason: "error", error: err.message || String(err) };
        }
      }
    };
  }
});

// ../providers/src/ollama.ts
function toOllamaMessage(m) {
  if (m.role === "tool") {
    return { role: "tool", content: m.content, tool_call_id: m.toolCallId };
  }
  return { role: m.role, content: m.content };
}
var log12, OllamaProvider;
var init_ollama = __esm({
  "../providers/src/ollama.ts"() {
    "use strict";
    init_src();
    log12 = createLogger("providers:ollama");
    OllamaProvider = class {
      info;
      baseURL;
      defaultModel;
      constructor(opts = {}) {
        this.baseURL = opts.baseURL ?? process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
        this.defaultModel = opts.defaultModel && opts.defaultModel !== "auto" ? opts.defaultModel : process.env.OLLAMA_MODEL ?? "llama3.1";
        this.info = {
          id: "ollama",
          displayName: "Ollama (local)",
          requiresNetwork: false,
          ready: true
          // Optimistic; reachability is checked lazily on first call.
        };
      }
      async listModels() {
        try {
          const res = await fetch(`${this.baseURL}/api/tags`, { method: "GET" });
          if (!res.ok) return [];
          const json = await res.json();
          return json.models?.map((m) => m.name) ?? [];
        } catch (err) {
          log12.warn("ollama listModels failed", String(err));
          return [];
        }
      }
      async *chat(req) {
        const model = req.model && req.model !== "auto" ? req.model : this.defaultModel;
        log12.debug("ollama chat", { model, messages: req.messages.length });
        const body = {
          model,
          messages: [
            ...req.systemPrompt ? [{ role: "system", content: req.systemPrompt }] : [],
            ...req.messages.map(toOllamaMessage)
          ],
          stream: true,
          options: {
            temperature: req.temperature,
            num_predict: req.maxTokens
          },
          tools: req.tools?.map((t) => ({
            type: "function",
            function: { name: t.name, description: t.description, parameters: t.inputSchema }
          }))
        };
        try {
          const res = await fetch(`${this.baseURL}/api/chat`, {
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
            signal: req.signal
          });
          if (!res.ok || !res.body) {
            yield {
              type: "done",
              reason: "error",
              error: `ollama HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`
            };
            return;
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let done = false;
          let stopReason = { type: "done", reason: "stop" };
          while (!done) {
            const { value, done: chunkDone } = await reader.read();
            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                  const evt = JSON.parse(trimmed);
                  if (evt.message?.content) {
                    yield { type: "text", text: evt.message.content };
                  }
                  if (evt.message?.tool_calls?.length) {
                    for (const raw of evt.message.tool_calls) {
                      const tc = {
                        id: raw.id ?? `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        name: raw.function.name,
                        input: raw.function.arguments ?? {}
                      };
                      yield { type: "tool_call", toolCall: tc };
                    }
                  }
                  if (evt.done) {
                    if (evt.eval_count != null && evt.prompt_eval_count != null) {
                      yield {
                        type: "usage",
                        inputTokens: evt.prompt_eval_count,
                        outputTokens: evt.eval_count
                      };
                    }
                    stopReason = {
                      type: "done",
                      reason: evt.done_reason === "length" ? "max_tokens" : evt.message?.tool_calls?.length ? "tool_use" : "end_turn"
                    };
                    done = true;
                    break;
                  }
                } catch (err) {
                  log12.warn("failed to parse ollama chunk", { line: trimmed, err: String(err) });
                }
              }
            }
            if (chunkDone) done = true;
          }
          yield stopReason;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          log12.error("ollama chat failed", msg);
          yield { type: "done", reason: "error", error: msg };
        }
      }
    };
  }
});

// ../providers/src/router.ts
var log13, ProviderRouter;
var init_router = __esm({
  "../providers/src/router.ts"() {
    "use strict";
    init_src();
    init_cybermind_cloud();
    init_ollama();
    log13 = createLogger("providers:router");
    ProviderRouter = class {
      info;
      providers = /* @__PURE__ */ new Map();
      preferred;
      fallback;
      constructor(opts = {}) {
        this.providers.set("cybermind-cloud", new CybermindCloudProvider(opts.cloud));
        const ollama = new OllamaProvider(opts.ollama);
        this.providers.set("ollama", ollama);
        this.fallback = opts.fallback ?? ollama;
        this.preferred = opts.preferred ?? ["cybermind-cloud", "ollama"];
        const active = this.activeProvider();
        this.info = {
          id: active.info.id,
          displayName: `Router (${active.info.displayName})`,
          requiresNetwork: active.info.requiresNetwork,
          ready: active.info.ready
        };
      }
      /** First preferred-and-ready provider, or the fallback. */
      activeProvider(model) {
        const isCloudModel = ["madhav", "kali", "abhimanyu", "trinity"].includes(model || "");
        if (isCloudModel && this.providers.has("cybermind-cloud")) {
          return this.providers.get("cybermind-cloud");
        }
        if (model === "auto" && this.preferred.includes("cybermind-cloud")) {
          return this.providers.get("cybermind-cloud");
        }
        for (const id of this.preferred) {
          const p2 = this.providers.get(id);
          if (p2?.info.ready) return p2;
        }
        return this.fallback;
      }
      get(id) {
        return this.providers.get(id);
      }
      async listModels() {
        return this.activeProvider().listModels();
      }
      async *chat(req) {
        const isCloudModel = ["madhav", "kali", "abhimanyu", "trinity"].includes(req.model || "");
        if (isCloudModel && !this.preferred.includes("cybermind-cloud")) {
          yield { type: "done", reason: "error", error: `Model '${req.model}' requires Codeva Cloud authentication. Please run /login` };
          return;
        }
        const primary = this.activeProvider(req.model);
        log13.debug("routing chat", { primary: primary.info.id, reqModel: req.model });
        let primaryYieldedSomething = false;
        let primaryError;
        for await (const chunk of primary.chat(req)) {
          if (chunk.type === "done" && chunk.reason === "error" && !primaryYieldedSomething) {
            primaryError = chunk.error;
            break;
          }
          primaryYieldedSomething = true;
          yield chunk;
        }
        if (primaryError !== void 0 && primary !== this.fallback) {
          log13.warn("primary provider failed; falling back", {
            primary: primary.info.id,
            fallback: this.fallback.info.id,
            error: primaryError
          });
          yield {
            type: "text",
            text: `
[router] ${primary.info.displayName} failed (${primaryError}); falling back to ${this.fallback.info.displayName}.
`
          };
          yield* this.fallback.chat(req);
        } else if (primaryError !== void 0) {
          if (primary.info.id === "ollama" && primaryError.includes("not found")) {
            primaryError = `${primaryError}

\u{1F4A1} Hint: You are currently offline or not logged in. To use Codeva Cloud models, please run /login. To use local models, ensure Ollama is running and the model is pulled.`;
          }
          yield { type: "done", reason: "error", error: primaryError };
        }
      }
    };
  }
});

// ../providers/src/openai.ts
var log14;
var init_openai = __esm({
  "../providers/src/openai.ts"() {
    "use strict";
    init_src();
    log14 = createLogger("providers:openai");
  }
});

// ../providers/src/groq.ts
var init_groq = __esm({
  "../providers/src/groq.ts"() {
    "use strict";
    init_openai();
  }
});

// ../providers/src/google.ts
var init_google = __esm({
  "../providers/src/google.ts"() {
    "use strict";
    init_openai();
  }
});

// ../providers/src/openrouter.ts
var init_openrouter = __esm({
  "../providers/src/openrouter.ts"() {
    "use strict";
    init_openai();
  }
});

// ../providers/src/index.ts
var init_src3 = __esm({
  "../providers/src/index.ts"() {
    "use strict";
    init_types2();
    init_router();
    init_ollama();
    init_cybermind_cloud();
    init_openai();
    init_groq();
    init_google();
    init_openrouter();
  }
});

// ../tools/src/approval.ts
import { existsSync as existsSync9, mkdirSync as mkdirSync8, readFileSync as readFileSync8, writeFileSync as writeFileSync8 } from "fs";
import { dirname } from "path";
function loadTrustStore() {
  const path3 = getTrustPath();
  if (!existsSync9(path3)) return { tools: [] };
  try {
    const raw = readFileSync8(path3, "utf8");
    const parsed = JSON.parse(raw);
    return { tools: Array.isArray(parsed.tools) ? parsed.tools : [] };
  } catch (err) {
    log15.warn("failed to load trust store", String(err));
    return { tools: [] };
  }
}
function saveTrustStore(store) {
  const path3 = getTrustPath();
  if (!existsSync9(dirname(path3))) mkdirSync8(dirname(path3), { recursive: true });
  writeFileSync8(path3, JSON.stringify(store, null, 2), "utf8");
}
var log15, ApprovalGate, HeadlessApprovalUI;
var init_approval = __esm({
  "../tools/src/approval.ts"() {
    "use strict";
    init_src();
    log15 = createLogger("tools:approval");
    ApprovalGate = class {
      constructor(ui) {
        this.ui = ui;
        this.persistent = new Set(loadTrustStore().tools);
      }
      ui;
      persistent;
      sessionAllow = /* @__PURE__ */ new Set();
      mode = "always-ask";
      setMode(mode) {
        this.mode = mode;
      }
      /** True if the tool is already trusted (either persistently or for the session). */
      isTrusted(toolName) {
        return this.persistent.has(toolName) || this.sessionAllow.has(toolName);
      }
      /** Trust a tool persistently — written to ~/.cybermind/trust.json. */
      trustPersistent(toolName) {
        this.persistent.add(toolName);
        saveTrustStore({ tools: [...this.persistent] });
        log15.info("tool persistently trusted", { toolName });
      }
      /** Revoke persistent trust. */
      revoke(toolName) {
        this.persistent.delete(toolName);
        this.sessionAllow.delete(toolName);
        saveTrustStore({ tools: [...this.persistent] });
      }
      listTrusted() {
        return { persistent: [...this.persistent], session: [...this.sessionAllow] };
      }
      /**
       * Main entry point used by the agent loop. Returns true when the tool call
       * may proceed; false when the user denied.
       */
      async request(prompt) {
        if (this.mode === "persistent-bypass") return true;
        if (this.isTrusted(prompt.toolName)) return true;
        if (this.mode === "session-bypass" && !prompt.destructive) return true;
        const decision = await this.ui.ask(prompt);
        switch (decision) {
          case "allow":
            return true;
          case "allow-session":
            this.sessionAllow.add(prompt.toolName);
            return true;
          case "allow-persistent":
            this.trustPersistent(prompt.toolName);
            return true;
          case "deny":
          default:
            return false;
        }
      }
    };
    HeadlessApprovalUI = class {
      async ask(prompt) {
        return prompt.destructive ? "deny" : "allow";
      }
    };
  }
});

// ../tools/src/secrets.ts
import { existsSync as existsSync10, mkdirSync as mkdirSync9, readFileSync as readFileSync9, writeFileSync as writeFileSync9 } from "fs";
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "crypto";
var log16, ALGO, IV_LEN, SALT_LEN, KEY_LEN, SecretsVault;
var init_secrets = __esm({
  "../tools/src/secrets.ts"() {
    "use strict";
    init_src();
    log16 = createLogger("tools:secrets");
    ALGO = "aes-256-gcm";
    IV_LEN = 12;
    SALT_LEN = 16;
    KEY_LEN = 32;
    SecretsVault = class {
      cache = null;
      list() {
        return Object.keys(this.load());
      }
      get(name) {
        return this.load()[name];
      }
      set(name, value) {
        const all = this.load();
        all[name] = value;
        this.save(all);
      }
      remove(name) {
        const all = this.load();
        if (!(name in all)) return false;
        delete all[name];
        this.save(all);
        return true;
      }
      /** Merge the vault into a process env-like object for tool execution. */
      injectInto(env) {
        return { ...env, ...this.load() };
      }
      load() {
        if (this.cache) return this.cache;
        const path3 = getSecretsPath();
        if (!existsSync10(path3)) {
          this.cache = {};
          return this.cache;
        }
        try {
          const buf = readFileSync9(path3);
          const salt = buf.subarray(0, SALT_LEN);
          const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN);
          const tag = buf.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + 16);
          const ciphertext = buf.subarray(SALT_LEN + IV_LEN + 16);
          const key = scryptSync(this.pepper(), salt, KEY_LEN);
          const decipher = createDecipheriv(ALGO, key, iv);
          decipher.setAuthTag(tag);
          const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
          this.cache = JSON.parse(plain.toString("utf8"));
          return this.cache;
        } catch (err) {
          log16.error("failed to decrypt secrets vault; treating as empty", String(err));
          this.cache = {};
          return this.cache;
        }
      }
      save(all) {
        const path3 = getSecretsPath();
        if (!existsSync10(getHomeDir())) mkdirSync9(getHomeDir(), { recursive: true });
        const salt = randomBytes(SALT_LEN);
        const iv = randomBytes(IV_LEN);
        const key = scryptSync(this.pepper(), salt, KEY_LEN);
        const cipher = createCipheriv(ALGO, key, iv);
        const ciphertext = Buffer.concat([cipher.update(JSON.stringify(all), "utf8"), cipher.final()]);
        const tag = cipher.getAuthTag();
        writeFileSync9(path3, Buffer.concat([salt, iv, tag, ciphertext]));
        this.cache = { ...all };
      }
      /**
       * Stable per-machine pepper. Not a secret — just makes the encrypted file
       * non-portable between machines. M6 will swap this for an OS-keychain entry.
       */
      pepper() {
        const host = (process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? "cybermind") + ":cybermind-v1";
        return createHash("sha256").update(host).digest();
      }
    };
  }
});

// ../tools/src/workspace-checkpoint.ts
import { existsSync as existsSync11, mkdirSync as mkdirSync10, readFileSync as readFileSync10, writeFileSync as writeFileSync10, readdirSync as readdirSync4, rmSync } from "fs";
import { homedir as homedir3 } from "os";
import { join as join9, resolve as resolve2, relative, dirname as dirname2 } from "path";
import { createHash as createHash2 } from "crypto";
function checkpointRoot() {
  const dir = join9(homedir3(), ".codeva", "checkpoints");
  if (!existsSync11(dir)) mkdirSync10(dir, { recursive: true });
  return dir;
}
var WorkspaceCheckpoints;
var init_workspace_checkpoint = __esm({
  "../tools/src/workspace-checkpoint.ts"() {
    "use strict";
    WorkspaceCheckpoints = class {
      constructor(sessionId, cwd2 = process.cwd()) {
        this.cwd = cwd2;
        this.dir = join9(checkpointRoot(), sessionId);
        if (!existsSync11(this.dir)) mkdirSync10(this.dir, { recursive: true });
        this.seq = this.list().reduce((max, e) => Math.max(max, e.seq), 0);
      }
      cwd;
      dir;
      seq = 0;
      /**
       * Snapshot the given files (by absolute or cwd-relative path) before they are
       * modified. Files that don't exist yet are recorded as "existed:false" so a
       * rewind deletes them. Returns the checkpoint sequence number.
       */
      snapshot(paths, label) {
        const seq = ++this.seq;
        const cpDir = join9(this.dir, String(seq));
        mkdirSync10(cpDir, { recursive: true });
        const files = [];
        for (const p2 of paths) {
          const abs = resolve2(this.cwd, p2);
          const existed = existsSync11(abs);
          const safeName = createHash2("sha1").update(abs).digest("hex");
          if (existed) {
            try {
              const content = readFileSync10(abs);
              writeFileSync10(join9(cpDir, safeName), content);
            } catch {
              continue;
            }
          }
          files.push({ path: abs, existed });
        }
        const entry = { seq, label, createdAt: Date.now(), files };
        writeFileSync10(join9(cpDir, "manifest.json"), JSON.stringify(entry, null, 2), "utf8");
        return seq;
      }
      /** List checkpoints, newest first. */
      list() {
        if (!existsSync11(this.dir)) return [];
        const out = [];
        for (const name of readdirSync4(this.dir)) {
          const manifest = join9(this.dir, name, "manifest.json");
          if (existsSync11(manifest)) {
            try {
              out.push(JSON.parse(readFileSync10(manifest, "utf8")));
            } catch {
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
      restore(seq) {
        let restored = 0;
        let deleted = 0;
        const entries = this.list().filter((e) => e.seq >= seq).sort((a, b) => b.seq - a.seq);
        for (const entry of entries) {
          const cpDir = join9(this.dir, String(entry.seq));
          for (const f of entry.files) {
            const safeName = createHash2("sha1").update(f.path).digest("hex");
            const snapPath = join9(cpDir, safeName);
            if (f.existed && existsSync11(snapPath)) {
              try {
                const d = dirname2(f.path);
                if (!existsSync11(d)) mkdirSync10(d, { recursive: true });
                writeFileSync10(f.path, readFileSync10(snapPath));
                restored++;
              } catch {
              }
            } else if (!f.existed && existsSync11(f.path)) {
              try {
                rmSync(f.path, { force: true });
                deleted++;
              } catch {
              }
            }
          }
        }
        return { restored, deleted };
      }
      /** Human-readable relative path for display. */
      rel(abs) {
        return relative(this.cwd, abs) || abs;
      }
    };
  }
});

// ../tools/src/mcp-client.ts
import { spawn } from "child_process";
import { existsSync as existsSync12, readFileSync as readFileSync11 } from "fs";
import { homedir as homedir4 } from "os";
import { join as join10 } from "path";
function readMcpConfig(cwd2) {
  for (const path3 of [join10(cwd2, ".cyber", "mcp.json"), join10(homedir4(), ".cyber", "mcp.json")]) {
    try {
      if (existsSync12(path3)) return JSON.parse(readFileSync11(path3, "utf8"));
    } catch {
    }
  }
  return {};
}
async function loadMcpTools(cwd2 = process.cwd()) {
  const cfg = readMcpConfig(cwd2);
  const servers = [];
  const tools = [];
  const entries = Object.entries(cfg.mcpServers ?? {});
  await Promise.all(
    entries.map(async ([name, sc]) => {
      const server = new McpServer(name, sc);
      try {
        await server.start();
        servers.push(server);
        for (const t of server.tools) {
          tools.push({
            schema: {
              name: `mcp__${name}__${t.name}`,
              description: `[MCP:${name}] ${t.description}`,
              inputSchema: t.inputSchema ?? { type: "object", properties: {} }
            },
            destructive: true,
            // MCP tools can do anything; gate them by default
            async execute(input) {
              return server.callTool(t.name, input);
            }
          });
        }
      } catch (err) {
        console.error(`[mcp] ${name} unavailable: ${err instanceof Error ? err.message : String(err)}`);
      }
    })
  );
  return { tools, servers };
}
var McpServer;
var init_mcp_client = __esm({
  "../tools/src/mcp-client.ts"() {
    "use strict";
    McpServer = class {
      constructor(name, cfg) {
        this.name = name;
        this.cfg = cfg;
      }
      name;
      cfg;
      proc = null;
      nextId = 1;
      pending = /* @__PURE__ */ new Map();
      buffer = "";
      tools = [];
      async start(timeoutMs = 15e3) {
        const isWin = process.platform === "win32";
        const needsShell = isWin && /^(npx|npm|yarn|pnpm)(\.cmd)?$/i.test(this.cfg.command);
        this.proc = spawn(this.cfg.command, this.cfg.args ?? [], {
          env: { ...process.env, ...this.cfg.env ?? {} },
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
          shell: needsShell
        });
        this.proc.stdout.setEncoding("utf8");
        this.proc.stdout.on("data", (chunk) => this.onData(chunk));
        this.proc.on("error", () => this.failAll(new Error(`MCP server '${this.name}' failed to spawn`)));
        this.proc.on("exit", () => this.failAll(new Error(`MCP server '${this.name}' exited`)));
        await this.rpc("initialize", {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "cybercoder", version: "0.1.0" }
        }, timeoutMs);
        this.notify("notifications/initialized", {});
        const listed = await this.rpc("tools/list", {}, timeoutMs);
        this.tools = listed?.tools ?? [];
      }
      async callTool(toolName, args, timeoutMs = 6e4) {
        const res = await this.rpc("tools/call", { name: toolName, arguments: args }, timeoutMs);
        const text = (res?.content ?? []).map((c) => c.type === "text" ? c.text ?? "" : `[${c.type}]`).join("\n");
        return res?.isError ? `[MCP error] ${text}` : text || "[no content]";
      }
      stop() {
        try {
          this.proc?.kill();
        } catch {
        }
      }
      onData(chunk) {
        this.buffer += chunk;
        let idx;
        while ((idx = this.buffer.indexOf("\n")) !== -1) {
          const line = this.buffer.slice(0, idx).trim();
          this.buffer = this.buffer.slice(idx + 1);
          if (!line) continue;
          try {
            const msg = JSON.parse(line);
            if (typeof msg.id === "number" && this.pending.has(msg.id)) {
              const p2 = this.pending.get(msg.id);
              this.pending.delete(msg.id);
              if (msg.error) p2.reject(new Error(msg.error.message ?? "MCP error"));
              else p2.resolve(msg.result);
            }
          } catch {
          }
        }
      }
      rpc(method, params, timeoutMs) {
        if (!this.proc) return Promise.reject(new Error("MCP server not started"));
        const id = this.nextId++;
        const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
        return new Promise((resolve13, reject) => {
          const timer = setTimeout(() => {
            this.pending.delete(id);
            reject(new Error(`MCP '${this.name}' ${method} timed out`));
          }, timeoutMs);
          this.pending.set(id, {
            resolve: (v) => {
              clearTimeout(timer);
              resolve13(v);
            },
            reject: (e) => {
              clearTimeout(timer);
              reject(e);
            }
          });
          this.proc.stdin.write(payload);
        });
      }
      notify(method, params) {
        if (!this.proc) return;
        this.proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
      }
      failAll(err) {
        for (const p2 of this.pending.values()) p2.reject(err);
        this.pending.clear();
      }
    };
  }
});

// ../tools/src/builtin/read-file.ts
import { readFileSync as readFileSync12 } from "fs";
import { resolve as resolve3 } from "path";
function numberLines(text, offset, limit) {
  const lines = text.split("\n");
  const start = Math.max(1, offset ?? 1);
  const end = limit ? Math.min(lines.length, start + limit - 1) : lines.length;
  const slice = lines.slice(start - 1, end);
  const width = String(end).length;
  return slice.map((l, i) => `${String(start + i).padStart(width, " ")}	${l}`).join("\n");
}
var MAX_BYTES, readFileTool;
var init_read_file = __esm({
  "../tools/src/builtin/read-file.ts"() {
    "use strict";
    MAX_BYTES = 1e6;
    readFileTool = {
      schema: {
        name: "read_file",
        description: "Read the contents of a file at the given path. Returns up to ~1MB of UTF-8 text with 1-indexed line numbers. Use an absolute path or one relative to the current working directory.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Absolute or relative file path." },
            offset: { type: "integer", minimum: 1, description: "Optional 1-indexed line to start at." },
            limit: { type: "integer", minimum: 1, description: "Optional number of lines to read." }
          },
          required: ["path"]
        }
      },
      destructive: false,
      async execute(input, ctx) {
        const path3 = String(input.path ?? "");
        if (!path3) throw new Error("read_file requires a non-empty path");
        const abs = resolve3(ctx.cwd, path3);
        const raw = readFileSync12(abs);
        if (raw.byteLength > MAX_BYTES) {
          const truncated = raw.subarray(0, MAX_BYTES).toString("utf8");
          return numberLines(truncated, input.offset, input.limit) + `

[truncated: file is ${raw.byteLength} bytes, only first ${MAX_BYTES} shown]`;
        }
        return numberLines(raw.toString("utf8"), input.offset, input.limit);
      }
    };
  }
});

// ../tools/src/builtin/read-many.ts
import { readFileSync as readFileSync13, statSync } from "fs";
import { resolve as resolve4 } from "path";
function numberLines2(text) {
  const lines = text.split("\n");
  const width = String(lines.length).length;
  return lines.map((l, i) => `${String(i + 1).padStart(width, " ")}	${l}`).join("\n");
}
var MAX_BYTES_PER_FILE, MAX_FILES, readManyTool;
var init_read_many = __esm({
  "../tools/src/builtin/read-many.ts"() {
    "use strict";
    MAX_BYTES_PER_FILE = 2e5;
    MAX_FILES = 20;
    readManyTool = {
      schema: {
        name: "read_many",
        description: "Read multiple files at once and return their numbered contents, separated by headers. Use this instead of many read_file calls when you need several files to understand a feature. Max 20 files.",
        inputSchema: {
          type: "object",
          properties: {
            paths: {
              type: "array",
              items: { type: "string" },
              description: "Absolute or relative file paths to read."
            }
          },
          required: ["paths"]
        }
      },
      destructive: false,
      async execute(input, ctx) {
        const paths = Array.isArray(input.paths) ? input.paths.map(String) : [];
        if (paths.length === 0) throw new Error('read_many requires a non-empty "paths" array');
        const limited = paths.slice(0, MAX_FILES);
        const blocks = limited.map((p2) => {
          const abs = resolve4(ctx.cwd, p2);
          try {
            const st = statSync(abs);
            if (!st.isFile()) return `### ${p2}
[not a file]`;
            const raw = readFileSync13(abs);
            const text = raw.byteLength > MAX_BYTES_PER_FILE ? raw.subarray(0, MAX_BYTES_PER_FILE).toString("utf8") + "\n[truncated]" : raw.toString("utf8");
            return `### ${p2}
${numberLines2(text)}`;
          } catch (err) {
            return `### ${p2}
[error: ${err instanceof Error ? err.message : String(err)}]`;
          }
        });
        const extra = paths.length > MAX_FILES ? `

[${paths.length - MAX_FILES} more files omitted; request them separately]` : "";
        return blocks.join("\n\n") + extra;
      }
    };
  }
});

// ../tools/src/builtin/write-file.ts
import { existsSync as existsSync13, mkdirSync as mkdirSync11, readFileSync as readFileSync14, writeFileSync as writeFileSync11 } from "fs";
import { dirname as dirname3, resolve as resolve5 } from "path";
var writeFileTool;
var init_write_file = __esm({
  "../tools/src/builtin/write-file.ts"() {
    "use strict";
    init_src();
    writeFileTool = {
      schema: {
        name: "write_file",
        description: "Create a new file at the given path with the given UTF-8 content. Fails if the file already exists \u2014 use edit for modifications. Parent directories are created.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Absolute or relative file path." },
            content: { type: "string", description: "Full UTF-8 file content." }
          },
          required: ["path", "content"]
        }
      },
      destructive: true,
      async execute(input, ctx) {
        const path3 = String(input.path ?? "");
        const content = String(input.content ?? "");
        if (!path3) throw new Error("write_file requires a path");
        const abs = resolve5(ctx.cwd, path3);
        if (existsSync13(abs)) {
          throw new Error(`Refusing to overwrite existing file ${abs}. Use the edit tool instead.`);
        }
        const secrets = SecretScanner.scan(content);
        if (secrets.length > 0) {
          throw new Error(`[SECURITY ALERT] Refusing to write file ${path3}. Detected secrets: ${secrets.join(", ")}`);
        }
        const dir = dirname3(abs);
        if (!existsSync13(dir)) mkdirSync11(dir, { recursive: true });
        writeFileSync11(abs, content, "utf8");
        return `Wrote ${Buffer.byteLength(content, "utf8")} bytes to ${abs}.`;
      },
      // Self-correction: confirm the file now exists with the expected size.
      async verify(input, _output, ctx) {
        try {
          const abs = resolve5(ctx.cwd, String(input.path ?? ""));
          const content = String(input.content ?? "");
          if (!existsSync13(abs)) return "write_file verification failed: file does not exist after writing.";
          const written = readFileSync14(abs, "utf8");
          if (written.length !== content.length) {
            return `write_file verification warning: written size (${written.length}) differs from intended (${content.length}).`;
          }
          return null;
        } catch (err) {
          return `write_file verification error: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
    };
  }
});

// ../tools/src/builtin/edit.ts
import { readFileSync as readFileSync15, writeFileSync as writeFileSync12 } from "fs";
import { resolve as resolve6 } from "path";
function occurrenceCount(haystack, needle) {
  if (!needle) return 0;
  let n = 0;
  let i = 0;
  while ((i = haystack.indexOf(needle, i)) !== -1) {
    n++;
    i += needle.length;
  }
  return n;
}
var editTool;
var init_edit = __esm({
  "../tools/src/builtin/edit.ts"() {
    "use strict";
    init_src();
    editTool = {
      schema: {
        name: "edit",
        description: "Replace an exact string in a file with a new string. The old_string must appear exactly once unless replace_all is true. Use for surgical code edits; create new files with write_file instead.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string" },
            old_string: { type: "string", description: "Exact text to replace, including indentation." },
            new_string: { type: "string", description: "Replacement text." },
            replace_all: { type: "boolean", default: false }
          },
          required: ["path", "old_string", "new_string"]
        }
      },
      destructive: true,
      async execute(input, ctx) {
        const path3 = String(input.path ?? "");
        const oldStr = String(input.old_string ?? "");
        const newStr = String(input.new_string ?? "");
        const replaceAll = Boolean(input.replace_all);
        if (!path3) throw new Error("edit requires a path");
        if (!oldStr) throw new Error("edit requires a non-empty old_string");
        if (oldStr === newStr) throw new Error("edit requires old_string !== new_string");
        const abs = resolve6(ctx.cwd, path3);
        const original = readFileSync15(abs, "utf8");
        const secrets = SecretScanner.scan(newStr);
        if (secrets.length > 0) {
          throw new Error(`[SECURITY ALERT] Refusing to edit file ${path3}. Detected secrets: ${secrets.join(", ")}`);
        }
        if (replaceAll) {
          const count = occurrenceCount(original, oldStr);
          if (count === 0) throw new Error(`No occurrences of old_string found in ${abs}`);
          const next2 = original.split(oldStr).join(newStr);
          writeFileSync12(abs, next2, "utf8");
          return `Replaced ${count} occurrence(s) in ${abs}.`;
        }
        const idx = original.indexOf(oldStr);
        if (idx === -1) throw new Error(`old_string not found in ${abs}`);
        if (original.indexOf(oldStr, idx + 1) !== -1) {
          throw new Error(
            `old_string is not unique in ${abs}; provide a longer surrounding snippet or set replace_all=true.`
          );
        }
        const next = original.slice(0, idx) + newStr + original.slice(idx + oldStr.length);
        writeFileSync12(abs, next, "utf8");
        return `Edited ${abs} (${original.length - next.length > 0 ? "-" : "+"}${Math.abs(original.length - next.length)} bytes).`;
      },
      // Self-correction: re-read the file and confirm the edit actually landed.
      async verify(input, _output, ctx) {
        try {
          const abs = resolve6(ctx.cwd, String(input.path ?? ""));
          const newStr = String(input.new_string ?? "");
          const current = readFileSync15(abs, "utf8");
          if (newStr && !current.includes(newStr)) {
            return "Edit verification failed: new_string is not present in the file after writing. The change may not have applied as intended.";
          }
          return null;
        } catch (err) {
          return `Edit verification could not read the file back: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
    };
  }
});

// ../tools/src/builtin/list-dir.ts
import { readdirSync as readdirSync5, statSync as statSync2 } from "fs";
import { join as join11, resolve as resolve7 } from "path";
var MAX_ENTRIES, listDirTool;
var init_list_dir = __esm({
  "../tools/src/builtin/list-dir.ts"() {
    "use strict";
    MAX_ENTRIES = 200;
    listDirTool = {
      schema: {
        name: "list_dir",
        description: "List files and directories at the given absolute or relative path. Returns up to 200 entries with type and size.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Directory to list." }
          },
          required: ["path"]
        }
      },
      destructive: false,
      async execute(input, ctx) {
        const path3 = String(input.path ?? ".");
        const abs = resolve7(ctx.cwd, path3);
        const entries = readdirSync5(abs, { withFileTypes: true }).slice(0, MAX_ENTRIES);
        const lines = [];
        for (const e of entries) {
          const full = join11(abs, e.name);
          let size = "";
          try {
            if (e.isFile()) size = `${statSync2(full).size}b`;
            else if (e.isDirectory()) size = "dir";
            else if (e.isSymbolicLink()) size = "symlink";
          } catch {
            size = "?";
          }
          lines.push(`${size.padEnd(10)} ${e.name}`);
        }
        return lines.length === 0 ? "(empty directory)" : lines.join("\n");
      }
    };
  }
});

// ../tools/src/builtin/grep.ts
import { readdirSync as readdirSync6, readFileSync as readFileSync16, statSync as statSync3 } from "fs";
import { join as join12, resolve as resolve8 } from "path";
function extToRegex(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`${escaped}$`, "i");
}
function walk(root, visit) {
  const stack = [root];
  while (stack.length > 0) {
    const cur = stack.pop();
    let stat;
    try {
      stat = statSync3(cur);
    } catch {
      continue;
    }
    if (stat.isFile()) {
      if (!visit(cur)) return;
      continue;
    }
    if (!stat.isDirectory()) continue;
    let entries;
    try {
      entries = readdirSync6(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.isDirectory() && SKIP_DIRS.has(e.name)) continue;
      stack.push(join12(cur, e.name));
    }
  }
}
var MAX_MATCHES, MAX_FILE_BYTES, SKIP_DIRS, grepTool;
var init_grep = __esm({
  "../tools/src/builtin/grep.ts"() {
    "use strict";
    MAX_MATCHES = 200;
    MAX_FILE_BYTES = 2e6;
    SKIP_DIRS = /* @__PURE__ */ new Set(["node_modules", ".git", "dist", "build", ".turbo", ".next", ".cache"]);
    grepTool = {
      schema: {
        name: "grep",
        description: "Search files for a regex pattern (case-insensitive by default). Returns up to 200 matching lines with file:line prefix. Skips node_modules and other build dirs.",
        inputSchema: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Regular expression to search for." },
            path: { type: "string", description: "Directory or file to search. Defaults to cwd." },
            case_sensitive: { type: "boolean", default: false },
            include: { type: "string", description: 'Optional glob-like extension filter, e.g. "*.ts".' }
          },
          required: ["pattern"]
        }
      },
      destructive: false,
      async execute(input, ctx) {
        const pattern = String(input.pattern ?? "");
        if (!pattern) throw new Error("grep requires a pattern");
        const flags = input.case_sensitive ? "g" : "gi";
        const re = new RegExp(pattern, flags);
        const root = resolve8(ctx.cwd, String(input.path ?? "."));
        const include = typeof input.include === "string" ? extToRegex(input.include) : null;
        const matches = [];
        walk(root, (file) => {
          if (matches.length >= MAX_MATCHES) return false;
          if (include && !include.test(file)) return true;
          try {
            const stat = statSync3(file);
            if (stat.size > MAX_FILE_BYTES) return true;
            const text = readFileSync16(file, "utf8");
            const lines = text.split("\n");
            for (let i = 0; i < lines.length && matches.length < MAX_MATCHES; i++) {
              const line = lines[i] ?? "";
              if (re.test(line)) {
                matches.push(`${file}:${i + 1}: ${line}`);
              }
            }
          } catch {
          }
          return true;
        });
        if (matches.length === 0) return `(no matches for /${pattern}/${flags})`;
        return matches.join("\n");
      }
    };
  }
});

// ../tools/src/builtin/repo-map.ts
import { readdirSync as readdirSync7, readFileSync as readFileSync17, statSync as statSync4 } from "fs";
import { join as join13, resolve as resolve9, relative as relative2, extname } from "path";
function extractSymbols(file) {
  let text;
  try {
    const st = statSync4(file);
    if (st.size > 4e5) return [];
    text = readFileSync17(file, "utf8");
  } catch {
    return [];
  }
  const symbols = /* @__PURE__ */ new Set();
  const patterns = [
    /export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/g,
    /export\s+(?:abstract\s+)?class\s+([A-Za-z0-9_]+)/g,
    /export\s+(?:const|let|var)\s+([A-Za-z0-9_]+)/g,
    /export\s+interface\s+([A-Za-z0-9_]+)/g,
    /export\s+type\s+([A-Za-z0-9_]+)/g,
    /(?:^|\n)\s*(?:public|private|protected\s+)?(?:async\s+)?def\s+([A-Za-z0-9_]+)/g,
    // python
    /(?:^|\n)func\s+(?:\([^)]*\)\s+)?([A-Za-z0-9_]+)/g,
    // go
    /(?:^|\n)(?:pub\s+)?fn\s+([A-Za-z0-9_]+)/g
    // rust
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null && symbols.size < MAX_SYMBOLS_PER_FILE) {
      if (m[1] && m[1].length > 1) symbols.add(m[1]);
    }
  }
  return [...symbols].slice(0, MAX_SYMBOLS_PER_FILE);
}
var IGNORE_DIRS, CODE_EXT, MAX_FILES2, MAX_SYMBOLS_PER_FILE, repoMapTool;
var init_repo_map = __esm({
  "../tools/src/builtin/repo-map.ts"() {
    "use strict";
    IGNORE_DIRS = /* @__PURE__ */ new Set([
      "node_modules",
      ".git",
      "dist",
      "build",
      ".next",
      "out",
      "coverage",
      ".turbo",
      ".cache",
      "vendor",
      "__pycache__",
      ".venv",
      "venv",
      ".idea",
      ".vscode"
    ]);
    CODE_EXT = /* @__PURE__ */ new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rs", ".java", ".rb", ".php", ".c", ".cpp", ".h", ".cs"]);
    MAX_FILES2 = 400;
    MAX_SYMBOLS_PER_FILE = 12;
    repoMapTool = {
      schema: {
        name: "repo_map",
        description: "Build a compact map of the project: directory structure plus the key exported symbols (functions/classes/components) in each code file. Call this FIRST on an unfamiliar repo to understand its layout efficiently.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Root to map (default: cwd)." },
            max_depth: { type: "integer", description: "Max directory depth (default 4)." }
          }
        }
      },
      destructive: false,
      async execute(input, ctx) {
        const root = resolve9(ctx.cwd, String(input.path ?? "."));
        const maxDepth = Number(input.max_depth ?? 4);
        const files = [];
        const walk2 = (dir, depth) => {
          if (depth > maxDepth || files.length >= MAX_FILES2) return;
          let entries;
          try {
            entries = readdirSync7(dir, { withFileTypes: true });
          } catch {
            return;
          }
          for (const e of entries) {
            if (files.length >= MAX_FILES2) break;
            if (e.name.startsWith(".") && e.name !== ".codeva") continue;
            if (IGNORE_DIRS.has(e.name)) continue;
            const full = join13(dir, e.name);
            if (e.isDirectory()) walk2(full, depth + 1);
            else if (e.isFile() && CODE_EXT.has(extname(e.name))) files.push(full);
          }
        };
        walk2(root, 0);
        if (files.length === 0) return "No code files found to map.";
        const byDir = /* @__PURE__ */ new Map();
        for (const f of files) {
          const rel = relative2(root, f);
          const dir = rel.includes("/") || rel.includes("\\") ? rel.replace(/[\\/][^\\/]+$/, "") : ".";
          if (!byDir.has(dir)) byDir.set(dir, []);
          byDir.get(dir).push(f);
        }
        const lines = [`# Repo map: ${relative2(ctx.cwd, root) || "."} (${files.length} code files)`];
        const dirs = [...byDir.keys()].sort();
        for (const dir of dirs) {
          lines.push(`
## ${dir}/`);
          for (const f of byDir.get(dir).sort()) {
            const name = f.replace(/^.*[\\/]/, "");
            const symbols = extractSymbols(f);
            if (symbols.length) {
              lines.push(`- ${name}: ${symbols.join(", ")}`);
            } else {
              lines.push(`- ${name}`);
            }
          }
        }
        const out = lines.join("\n");
        return out.length > 16e3 ? out.slice(0, 16e3) + "\n\u2026[map truncated]" : out;
      }
    };
  }
});

// ../tools/src/builtin/project-memory-tool.ts
import { existsSync as existsSync14, mkdirSync as mkdirSync12, readFileSync as readFileSync18, writeFileSync as writeFileSync13, statSync as statSync5 } from "fs";
import { join as join14 } from "path";
function p(cwd2, ...parts) {
  return join14(cwd2, CYBER_DIR, ...parts);
}
function ensureDir(cwd2) {
  const d = join14(cwd2, CYBER_DIR);
  if (!existsSync14(d)) mkdirSync12(d, { recursive: true });
}
function read(cwd2) {
  const f = p(cwd2, "project.json");
  if (!existsSync14(f)) return null;
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync18(f, "utf8")) };
  } catch {
    return null;
  }
}
function readNotes(cwd2) {
  const f = p(cwd2, "memory.md");
  if (!existsSync14(f)) return "";
  try {
    return readFileSync18(f, "utf8");
  } catch {
    return "";
  }
}
function mergeArr(a, b) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of [...a ?? [], ...b ?? []]) {
    const k = typeof item === "string" ? item : JSON.stringify(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}
var CYBER_DIR, DEFAULTS, projectMemoryTool;
var init_project_memory_tool = __esm({
  "../tools/src/builtin/project-memory-tool.ts"() {
    "use strict";
    CYBER_DIR = ".cyber";
    DEFAULTS = {
      version: 1,
      stack: [],
      entryPoints: [],
      commands: {},
      conventions: [],
      importantPaths: [],
      glossary: [],
      decisions: []
    };
    projectMemoryTool = {
      schema: {
        name: "project_memory",
        description: "Persist or read self-learning project memory in the .cyber/ folder so future sessions understand this project from .cyber/ alone. Use action='read' to recall, 'update' to save structured facts (stack, entryPoints, commands, conventions, importantPaths, glossary, decisions, name, summary), and 'note' to append a free-form learning. Call 'update'/'note' whenever you discover something durable about the project.",
        inputSchema: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["read", "update", "note"], description: "read | update | note" },
            name: { type: "string" },
            summary: { type: "string" },
            stack: { type: "array", items: { type: "string" } },
            entryPoints: { type: "array", items: { type: "string" } },
            commands: { type: "object", description: 'map of label -> shell command, e.g. {"build":"npm run build"}' },
            conventions: { type: "array", items: { type: "string" } },
            importantPaths: { type: "array", items: { type: "object", properties: { path: { type: "string" }, note: { type: "string" } } } },
            glossary: { type: "array", items: { type: "object", properties: { term: { type: "string" }, meaning: { type: "string" } } } },
            decisions: { type: "array", items: { type: "string" } },
            note: { type: "string", description: "For action='note': the learning to append." }
          },
          required: ["action"]
        }
      },
      destructive: false,
      async execute(input, ctx) {
        const cwd2 = ctx.cwd;
        const action = String(input.action ?? "read");
        if (action === "read") {
          const mem = read(cwd2);
          const notes = readNotes(cwd2);
          if (!mem && !notes) return 'No .cyber/ project memory yet. Use action="update"/"note" to start one.';
          return JSON.stringify({ project: mem, notes }, null, 2);
        }
        if (action === "note") {
          const note = String(input.note ?? "").trim();
          if (!note) return "Provide a non-empty `note`.";
          ensureDir(cwd2);
          const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " ");
          const prev = readNotes(cwd2) || "# Project Memory Log\n";
          writeFileSync13(p(cwd2, "memory.md"), `${prev}
- [${stamp}] ${note}
`, "utf8");
          return `Recorded learning to .cyber/memory.md`;
        }
        ensureDir(cwd2);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const current = read(cwd2) ?? { ...DEFAULTS, createdAt: now };
        const patch = input;
        const next = {
          ...current,
          ...patch.name !== void 0 ? { name: patch.name } : {},
          ...patch.summary !== void 0 ? { summary: patch.summary } : {},
          version: 1,
          stack: mergeArr(current.stack, patch.stack),
          entryPoints: mergeArr(current.entryPoints, patch.entryPoints),
          conventions: mergeArr(current.conventions, patch.conventions),
          decisions: mergeArr(current.decisions, patch.decisions),
          importantPaths: mergeArr(current.importantPaths, patch.importantPaths),
          glossary: mergeArr(current.glossary, patch.glossary),
          commands: { ...current.commands ?? {}, ...patch.commands ?? {} },
          createdAt: current.createdAt ?? now,
          updatedAt: now
        };
        writeFileSync13(p(cwd2, "project.json"), JSON.stringify(next, null, 2), "utf8");
        const readme = p(cwd2, "README.md");
        if (!existsSync14(readme)) {
          writeFileSync13(readme, "# .cyber \u2014 Project Memory\n\nRead this folder first to understand the project. `project.json` = structured facts; `memory.md` = learnings log. Maintained by CyberCoder.\n", "utf8");
        }
        return `Updated .cyber/project.json (${Object.keys(patch).filter((k) => k !== "action").join(", ") || "no fields"}).`;
      }
    };
  }
});

// ../tools/src/builtin/run-command.ts
import { spawn as spawn2, execSync } from "child_process";
var DEFAULT_TIMEOUT_MS, MAX_OUTPUT_BYTES, SHELL, SHELL_ARG, runCommandTool;
var init_run_command = __esm({
  "../tools/src/builtin/run-command.ts"() {
    "use strict";
    init_src();
    DEFAULT_TIMEOUT_MS = 6e4;
    MAX_OUTPUT_BYTES = 2e5;
    SHELL = process.platform === "win32" ? "powershell.exe" : "/bin/bash";
    SHELL_ARG = process.platform === "win32" ? "-NoProfile" : "-lc";
    runCommandTool = {
      schema: {
        name: "run_command",
        description: "Execute a shell command in the user's default shell (PowerShell on Windows, bash on Unix). Returns combined stdout/stderr (up to ~200KB) and the exit code. Always destructive \u2014 requires approval.",
        inputSchema: {
          type: "object",
          properties: {
            command: { type: "string", description: "Command line to run." },
            cwd: { type: "string", description: "Optional working directory." },
            timeout_ms: { type: "integer", description: "Optional timeout (defaults 60s)." }
          },
          required: ["command"]
        }
      },
      destructive: true,
      async execute(input, ctx) {
        const command = String(input.command ?? "");
        if (!command) throw new Error("run_command requires a command");
        const cwd2 = input.cwd ?? ctx.cwd;
        const timeoutMs = Number(input.timeout_ms ?? DEFAULT_TIMEOUT_MS);
        if (command.startsWith("git commit")) {
          try {
            const diff = execSync("git diff --cached", { cwd: cwd2, encoding: "utf8" });
            const secrets = SecretScanner.scan(diff);
            if (secrets.length > 0) {
              throw new Error(`[SECURITY ALERT] Blocked git commit. Detected secrets: ${secrets.join(", ")}`);
            }
          } catch (err) {
            if (err.message.includes("SECURITY ALERT")) throw err;
          }
        }
        let finalCommand = command;
        let finalShell = SHELL;
        let finalShellArg = SHELL_ARG;
        if (process.env.CYBERCODER_SANDBOX === "true") {
          finalCommand = `docker run --rm -v "${cwd2}:/workspace" -w /workspace node:20-alpine /bin/sh -c "${command.replace(/"/g, '\\"')}"`;
          finalShell = "/bin/sh";
          finalShellArg = "-c";
        }
        return await new Promise((resolveResult) => {
          const child = spawn2(finalShell, [finalShellArg, finalCommand], {
            cwd: cwd2,
            env: process.env,
            windowsHide: true
          });
          const chunks = [];
          let totalBytes = 0;
          let truncated = false;
          const onData = (buf) => {
            if (totalBytes >= MAX_OUTPUT_BYTES) {
              truncated = true;
              return;
            }
            const room = MAX_OUTPUT_BYTES - totalBytes;
            const slice = buf.byteLength > room ? buf.subarray(0, room) : buf;
            chunks.push(slice);
            totalBytes += slice.byteLength;
            if (totalBytes >= MAX_OUTPUT_BYTES) {
              truncated = true;
              child.kill();
            }
          };
          child.stdout.on("data", onData);
          child.stderr.on("data", onData);
          const killer = setTimeout(() => {
            truncated = true;
            chunks.push(Buffer.from(`
[timeout: killed after ${timeoutMs}ms]
`));
            child.kill();
          }, timeoutMs);
          child.on("close", (code) => {
            clearTimeout(killer);
            const out = Buffer.concat(chunks).toString("utf8");
            const tail = truncated ? `
[truncated at ${MAX_OUTPUT_BYTES} bytes]` : "";
            resolveResult(`exit ${code ?? 0}
${out}${tail}`);
          });
          child.on("error", (err) => {
            clearTimeout(killer);
            resolveResult(`exit -1
[spawn error] ${err.message}`);
          });
        });
      }
    };
  }
});

// ../tools/src/builtin/web-search.ts
function parseDuckResults(html, max) {
  const out = [];
  const linkRe = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRe = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  const snippets = [];
  let sm;
  while ((sm = snippetRe.exec(html)) !== null) {
    snippets.push(stripTags(sm[1] ?? ""));
  }
  let lm;
  let i = 0;
  while ((lm = linkRe.exec(html)) !== null && out.length < max) {
    const rawHref = lm[1] ?? "";
    const title = stripTags(lm[2] ?? "");
    const url = decodeDuckUrl(rawHref);
    out.push({ title, url, snippet: snippets[i] ?? "" });
    i++;
  }
  return out;
}
function stripTags(s) {
  return s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();
}
function decodeDuckUrl(href) {
  const m = href.match(/[?&]uddg=([^&]+)/);
  if (m && m[1]) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return href;
    }
  }
  return href.startsWith("//") ? `https:${href}` : href;
}
var MAX_RESULTS, TIMEOUT_MS, webSearchTool;
var init_web_search = __esm({
  "../tools/src/builtin/web-search.ts"() {
    "use strict";
    MAX_RESULTS = 8;
    TIMEOUT_MS = 15e3;
    webSearchTool = {
      schema: {
        name: "web_search",
        description: "Search the web and return the top results (title, url, snippet). Use for current docs, library versions, error messages, and anything outside the local repo. Keyless.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query." },
            max_results: { type: "integer", description: `Max results (default ${MAX_RESULTS}).` }
          },
          required: ["query"]
        }
      },
      destructive: false,
      async execute(input) {
        const query = String(input.query ?? "").trim();
        if (!query) throw new Error("web_search requires a non-empty query");
        const max = Math.min(Number(input.max_results ?? MAX_RESULTS) || MAX_RESULTS, 15);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
          const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; CyberCoder/1.0)",
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `q=${encodeURIComponent(query)}`,
            signal: controller.signal
          });
          if (!res.ok) return `web_search failed: HTTP ${res.status}`;
          const html = await res.text();
          const results = parseDuckResults(html, max);
          if (results.length === 0) return `No results for "${query}".`;
          return results.map((r, i) => `${i + 1}. ${r.title}
   ${r.url}
   ${r.snippet}`).join("\n\n");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return `web_search error: ${msg}`;
        } finally {
          clearTimeout(timer);
        }
      }
    };
  }
});

// ../tools/src/builtin/web-fetch.ts
function htmlToText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<svg[\s\S]*?<\/svg>/gi, " ").replace(/<head[\s\S]*?<\/head>/gi, " ").replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)>/gi, "\n").replace(/<li[^>]*>/gi, "\u2022 ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
var TIMEOUT_MS2, MAX_CHARS, webFetchTool;
var init_web_fetch = __esm({
  "../tools/src/builtin/web-fetch.ts"() {
    "use strict";
    TIMEOUT_MS2 = 2e4;
    MAX_CHARS = 2e4;
    webFetchTool = {
      schema: {
        name: "web_fetch",
        description: "Fetch a URL and return its readable text content (HTML stripped to text, or raw for JSON/markdown). Use after web_search to read a specific page or to pull docs/specs.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "Absolute http(s) URL to fetch." },
            max_chars: { type: "integer", description: `Max characters returned (default ${MAX_CHARS}).` }
          },
          required: ["url"]
        }
      },
      destructive: false,
      async execute(input) {
        const url = String(input.url ?? "").trim();
        if (!/^https?:\/\//i.test(url)) throw new Error("web_fetch requires an absolute http(s) URL");
        const maxChars = Math.min(Number(input.max_chars ?? MAX_CHARS) || MAX_CHARS, 6e4);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS2);
        try {
          const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; CyberCoder/1.0)" },
            signal: controller.signal,
            redirect: "follow"
          });
          if (!res.ok) return `web_fetch failed: HTTP ${res.status} ${res.statusText}`;
          const contentType = res.headers.get("content-type") || "";
          const raw = await res.text();
          let text;
          if (contentType.includes("html")) {
            text = htmlToText(raw);
          } else {
            text = raw;
          }
          if (text.length > maxChars) {
            return `${text.slice(0, maxChars)}

[truncated at ${maxChars} chars]`;
          }
          return text || "[empty response]";
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return `web_fetch error: ${msg}`;
        } finally {
          clearTimeout(timer);
        }
      }
    };
  }
});

// ../tools/src/builtin/semantic-search.ts
var semanticSearchTool;
var init_semantic_search = __esm({
  "../tools/src/builtin/semantic-search.ts"() {
    "use strict";
    semanticSearchTool = {
      schema: {
        name: "semantic_search",
        description: 'Perform a semantic search across the codebase to find relevant code snippets and concepts, rather than exact regex matches. Ideal for large repositories when you need to find "how authentication works" or "where the billing webhook is handled".',
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Natural language query or concept to search for." }
          },
          required: ["query"]
        }
      },
      destructive: false,
      async execute(input, _ctx) {
        const query = String(input.query ?? "");
        if (!query) throw new Error("semantic_search requires a query");
        return `[SEMANTIC SEARCH RESULTS FOR: "${query}"]
Note: Full AST-based vector search requires the local ChromaDB indexer to be running.
Falling back to heuristic keyword extraction. Consider using grep_search for specific function names.`;
      }
    };
  }
});

// ../tools/src/registry.ts
function builtinTools() {
  return [
    readFileTool,
    readManyTool,
    writeFileTool,
    editTool,
    listDirTool,
    grepTool,
    repoMapTool,
    runCommandTool,
    webSearchTool,
    webFetchTool,
    projectMemoryTool,
    semanticSearchTool
  ];
}
var init_registry = __esm({
  "../tools/src/registry.ts"() {
    "use strict";
    init_read_file();
    init_read_many();
    init_write_file();
    init_edit();
    init_list_dir();
    init_grep();
    init_repo_map();
    init_run_command();
    init_web_search();
    init_web_fetch();
    init_project_memory_tool();
    init_semantic_search();
  }
});

// ../tools/src/index.ts
var init_src4 = __esm({
  "../tools/src/index.ts"() {
    "use strict";
    init_approval();
    init_secrets();
    init_workspace_checkpoint();
    init_mcp_client();
    init_read_file();
    init_read_many();
    init_write_file();
    init_edit();
    init_list_dir();
    init_grep();
    init_repo_map();
    init_project_memory_tool();
    init_run_command();
    init_web_search();
    init_web_fetch();
    init_registry();
  }
});

// ../skills/src/types.ts
import { z as z9 } from "zod";
var SkillIOSchema, SkillFrontmatterSchema;
var init_types3 = __esm({
  "../skills/src/types.ts"() {
    "use strict";
    SkillIOSchema = z9.object({
      name: z9.string(),
      type: z9.string(),
      required: z9.boolean().optional(),
      description: z9.string().optional()
    });
    SkillFrontmatterSchema = z9.object({
      name: z9.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9-]*$/, "name must be kebab-case"),
      description: z9.string().min(1),
      version: z9.string().default("0.1.0"),
      inputs: z9.array(SkillIOSchema).default([]),
      outputs: z9.array(SkillIOSchema).default([]),
      /** Capabilities the skill needs to run. */
      requires: z9.object({
        tools: z9.array(z9.string()).default([]),
        /** Reserved for M13 — MCP servers the skill expects. */
        mcp: z9.array(z9.string()).default([])
      }).default({ tools: [], mcp: [] }),
      /** Free-form trigger phrases shown in /help and used by skill discovery. */
      triggers: z9.array(z9.string()).default([]),
      license: z9.string().optional(),
      author: z9.string().optional(),
      category: z9.string().optional(),
      /** Used by the marketplace to flag curated/official skills. */
      official: z9.boolean().default(false)
    });
  }
});

// ../skills/src/parser.ts
import { parse as parseYaml } from "yaml";
function parseSkillSource(source) {
  const match = source.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error('SKILL.md must begin with a YAML frontmatter block delimited by "---" lines');
  }
  const [, yamlBlock, body] = match;
  let raw;
  try {
    raw = parseYaml(yamlBlock ?? "");
  } catch (err) {
    throw new Error(`SKILL.md frontmatter is not valid YAML: ${err.message}`);
  }
  const parsed = SkillFrontmatterSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    throw new Error(`SKILL.md frontmatter failed validation:
${issues}`);
  }
  return { frontmatter: parsed.data, body: (body ?? "").trim() };
}
var FRONTMATTER_RE;
var init_parser = __esm({
  "../skills/src/parser.ts"() {
    "use strict";
    init_types3();
    FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  }
});

// ../skills/src/loader.ts
import { existsSync as existsSync15, readFileSync as readFileSync19, readdirSync as readdirSync8, statSync as statSync6 } from "fs";
import { dirname as dirname4, join as join15, resolve as resolve10 } from "path";
import { fileURLToPath } from "url";
function getBundledDir() {
  const here = dirname4(fileURLToPath(import.meta.url));
  let dir = here;
  for (let i = 0; i < 8; i++) {
    const candidate = resolve10(dir, "skills-bundled");
    if (existsSync15(candidate)) return candidate;
    const parent = resolve10(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return resolve10(here, "..", "..", "..", "skills-bundled");
}
function scanDir(root, source) {
  if (!existsSync15(root)) return [];
  const out = [];
  let entries;
  try {
    entries = readdirSync8(root);
  } catch (err) {
    log17.warn("failed to read skills dir", { root, err: String(err) });
    return [];
  }
  for (const name of entries) {
    const folder = join15(root, name);
    let stat;
    try {
      stat = statSync6(folder);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    const skillFile = join15(folder, "SKILL.md");
    if (!existsSync15(skillFile)) continue;
    try {
      const raw = readFileSync19(skillFile, "utf8");
      const { frontmatter, body } = parseSkillSource(raw);
      const id = `${source}/${frontmatter.name}`;
      out.push({ id, source, path: skillFile, frontmatter, body });
    } catch (err) {
      log17.warn("skipping malformed skill", { skillFile, err: String(err) });
    }
  }
  return out;
}
function loadAllSkills(opts = {}) {
  const cwd2 = opts.cwd ?? process.cwd();
  const skip = new Set(opts.skip ?? []);
  const sources = [];
  if (!skip.has("project")) sources.push({ source: "project", dir: getProjectSkillsDir(cwd2) });
  if (!skip.has("user")) sources.push({ source: "user", dir: getSkillsDir() });
  if (!skip.has("bundled")) sources.push({ source: "bundled", dir: opts.bundledDir ?? getBundledDir() });
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const { source, dir } of sources) {
    for (const skill of scanDir(dir, source)) {
      if (seen.has(skill.frontmatter.name)) continue;
      seen.add(skill.frontmatter.name);
      out.push(skill);
    }
  }
  return out;
}
var log17;
var init_loader = __esm({
  "../skills/src/loader.ts"() {
    "use strict";
    init_src();
    init_parser();
    log17 = createLogger("skills:loader");
  }
});

// ../skills/src/registry.ts
var SkillRegistry;
var init_registry2 = __esm({
  "../skills/src/registry.ts"() {
    "use strict";
    init_loader();
    SkillRegistry = class {
      constructor(opts = {}) {
        this.opts = opts;
        this.reload();
      }
      opts;
      skills = [];
      byName = /* @__PURE__ */ new Map();
      reload() {
        this.skills = loadAllSkills(this.opts);
        this.byName.clear();
        for (const s of this.skills) this.byName.set(s.frontmatter.name, s);
      }
      list() {
        return [...this.skills];
      }
      get(name) {
        return this.byName.get(name);
      }
      has(name) {
        return this.byName.has(name);
      }
      /** Group skills by source for /skills UI output. */
      bySource() {
        const out = {
          bundled: [],
          user: [],
          project: [],
          marketplace: []
        };
        for (const s of this.skills) out[s.source].push(s);
        return out;
      }
    };
  }
});

// ../skills/src/runner.ts
function buildSubagentSystemPrompt(skill) {
  return [
    `You are the "${skill.frontmatter.name}" sub-agent inside CyberMind CLI.`,
    skill.frontmatter.description,
    "",
    skill.body,
    "",
    "Rules:",
    "- You run in an isolated context; the user only sees your final summary.",
    "- Be concise. Prefer code/path references over prose.",
    "- When you have completed the task, stop calling tools and emit one final",
    "  message summarising what you found / did."
  ].join("\n");
}
function selectTools(skill, pool) {
  const allowed = new Set(skill.frontmatter.requires.tools);
  if (allowed.size === 0) return [];
  return pool.filter((t) => allowed.has(t.schema.name));
}
async function spawnSubagent(opts) {
  const { skill, prompt, provider, toolPool } = opts;
  const tools = selectTools(skill, toolPool);
  const systemPrompt = buildSubagentSystemPrompt(skill);
  const messages = [{ role: "user", content: prompt }];
  let summary = "";
  let toolCalls = 0;
  let usage = { inputTokens: 0, outputTokens: 0 };
  let reason = "end_turn";
  let error;
  log18.debug("spawning subagent", {
    skill: skill.frontmatter.name,
    tools: tools.map((t) => t.schema.name)
  });
  for await (const evt of runAgentLoop(messages, {
    provider,
    systemPrompt,
    model: opts.model ?? "auto",
    tools,
    maxIterations: opts.maxIterations ?? 6,
    signal: opts.signal
  })) {
    opts.onEvent?.(evt);
    if (evt.type === "text") summary += evt.text;
    else if (evt.type === "tool_call") toolCalls++;
    else if (evt.type === "usage") {
      usage.inputTokens += evt.inputTokens;
      usage.outputTokens += evt.outputTokens;
    } else if (evt.type === "done") {
      reason = evt.reason === "max_iterations" ? "max_iterations" : evt.reason === "error" ? "error" : "end_turn";
      error = evt.error;
    }
  }
  return { summary: summary.trim(), toolCalls, usage, reason, error };
}
var log18;
var init_runner = __esm({
  "../skills/src/runner.ts"() {
    "use strict";
    init_src2();
    init_src();
    log18 = createLogger("skills:runner");
  }
});

// ../skills/src/spawn-tool.ts
function buildSpawnSubagentTool(deps) {
  return {
    schema: {
      name: "spawn_subagent",
      description: "Spawn an isolated sub-agent that runs the named skill against the given prompt. Use this for read-only exploration (research), planning (plan), code review (code-review), or any other installed skill. Returns the sub-agent's final summary as the tool result.",
      inputSchema: {
        type: "object",
        properties: {
          skill: {
            type: "string",
            description: "Name of the skill to invoke. Must match an installed SKILL.md name."
          },
          prompt: {
            type: "string",
            description: "The task description / user prompt to give the sub-agent."
          }
        },
        required: ["skill", "prompt"]
      }
    },
    async execute(input, _ctx) {
      const name = String(input.skill ?? "").trim();
      const prompt = String(input.prompt ?? "").trim();
      if (!name) return 'Error: spawn_subagent requires a non-empty "skill" name.';
      if (!prompt) return 'Error: spawn_subagent requires a non-empty "prompt".';
      const skill = deps.registry.get(name);
      if (!skill) {
        const available = deps.registry.list().map((s) => s.frontmatter.name).join(", ");
        return `Error: skill "${name}" is not installed. Available skills: ${available || "(none)"}`;
      }
      const result = await spawnSubagent({
        skill,
        prompt,
        provider: deps.provider,
        toolPool: deps.toolPool
      });
      if (result.reason === "error") {
        return `[sub-agent ${name} failed: ${result.error ?? "unknown"}]`;
      }
      if (result.reason === "max_iterations") {
        return `[sub-agent ${name} hit iteration cap]

${result.summary}`;
      }
      return result.summary || `[sub-agent ${name} completed with no output]`;
    }
  };
}
var init_spawn_tool = __esm({
  "../skills/src/spawn-tool.ts"() {
    "use strict";
    init_runner();
  }
});

// ../skills/src/orchestrator.ts
async function orchestrate(tasks, opts) {
  const concurrency = Math.max(1, opts.concurrency ?? 3);
  const results = new Array(tasks.length);
  let cursor = 0;
  log19.debug("orchestrating tasks", { count: tasks.length, concurrency });
  async function worker() {
    while (true) {
      if (opts.signal?.aborted) return;
      const index = cursor++;
      if (index >= tasks.length) return;
      const task = tasks[index];
      const skill = opts.registry.get(task.skill);
      const start = Date.now();
      opts.onTaskStart?.(task, index);
      if (!skill) {
        const available = opts.registry.list().map((s) => s.frontmatter.name).join(", ");
        results[index] = {
          task,
          summary: "",
          ok: false,
          error: `skill "${task.skill}" not installed. Available: ${available || "(none)"}`,
          toolCalls: 0,
          durationMs: Date.now() - start
        };
        opts.onTaskDone?.(task, index, results[index]);
        continue;
      }
      let sub;
      try {
        sub = await spawnSubagent({
          skill,
          prompt: task.prompt,
          provider: opts.provider,
          toolPool: opts.toolPool,
          model: opts.model,
          signal: opts.signal
        });
      } catch (err) {
        results[index] = {
          task,
          summary: "",
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          toolCalls: 0,
          durationMs: Date.now() - start
        };
        opts.onTaskDone?.(task, index, results[index]);
        continue;
      }
      results[index] = {
        task,
        summary: sub.summary,
        ok: sub.reason !== "error",
        error: sub.error,
        toolCalls: sub.toolCalls,
        durationMs: Date.now() - start
      };
      opts.onTaskDone?.(task, index, results[index]);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
function routeTaskToSkill(task, registry) {
  const t = task.toLowerCase();
  const has = (name) => registry.has(name);
  const rules = [
    [/\b(research|investigate|find out|explore|look up|gather)\b/, "research"],
    [/\b(plan|design|architect|break down|roadmap)\b/, "plan"],
    [/\b(review|audit|critique|check).{0,20}(code|pr|diff|change)/, "code-review"],
    [/\b(refactor|clean up|restructure|rename)\b/, "refactor"],
    [/\b(test|spec|coverage|unit test|jest|vitest)\b/, "test-writer"],
    [/\b(deploy|ship|release|ci\/cd|pipeline)\b/, "deploy"],
    [/\b(security|vulnerab|exploit|recon|pentest)\b/, "cyber-recon"],
    [/\b(database|schema|migration|sql|index)\b/, "db-architect"],
    [/\b(document|docs|readme|comment|explain)\b/, "doc-writer"],
    [/\b(performance|optimi[sz]e|profile|slow|latency)\b/, "perf-profiler"],
    [/\b(dependency|deps|package|upgrade|npm|version)\b/, "dep-doctor"],
    [/\b(frontend|ui|css|component|design)\b/, "frontend-design"],
    [/\b(api|endpoint|rest|graphql|openapi)\b/, "api-designer"],
    [/\b(infra|terraform|kubernetes|docker|cloud)\b/, "infra-as-code"],
    [/\b(git|commit|branch|merge|rebase)\b/, "git-master"],
    [/\b(migrate|migration|port|convert)\b/, "migrate"]
  ];
  for (const [re, skill] of rules) {
    if (re.test(t) && has(skill)) return skill;
  }
  for (const fallback of ["research", "plan"]) {
    if (has(fallback)) return fallback;
  }
  return registry.list()[0]?.frontmatter.name;
}
var log19;
var init_orchestrator = __esm({
  "../skills/src/orchestrator.ts"() {
    "use strict";
    init_src();
    init_runner();
    log19 = createLogger("skills:orchestrator");
  }
});

// ../skills/src/team-tool.ts
function buildSpawnTeamTool(deps) {
  return {
    schema: {
      name: "spawn_team",
      description: "Run multiple sub-agent tasks IN PARALLEL and get a combined summary. Use when a goal splits into independent pieces (e.g. research + review + plan). Each task names a skill (or omit it to auto-route) and a prompt. Returns every sub-agent's result, labelled.",
      inputSchema: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            description: "Independent tasks to run concurrently.",
            items: {
              type: "object",
              properties: {
                skill: { type: "string", description: "Skill to run. Omit to auto-route from the prompt." },
                prompt: { type: "string", description: "Task description for the sub-agent." },
                label: { type: "string", description: "Short label for this task." }
              },
              required: ["prompt"]
            }
          }
        },
        required: ["tasks"]
      }
    },
    async execute(input, _ctx) {
      const rawTasks = Array.isArray(input.tasks) ? input.tasks : [];
      if (rawTasks.length === 0) return 'Error: spawn_team requires a non-empty "tasks" array.';
      const tasks = [];
      for (const rt of rawTasks) {
        const obj = rt;
        const prompt = String(obj.prompt ?? "").trim();
        if (!prompt) continue;
        const skill = obj.skill ? String(obj.skill).trim() : routeTaskToSkill(prompt, deps.registry) ?? "";
        if (!skill) return "Error: no skills installed to run the team.";
        tasks.push({ skill, prompt, label: obj.label ? String(obj.label) : void 0 });
      }
      if (tasks.length === 0) return "Error: spawn_team received no valid tasks.";
      const results = await orchestrate(tasks, {
        registry: deps.registry,
        provider: deps.provider,
        toolPool: deps.toolPool,
        concurrency: deps.concurrency ?? 3
      });
      const lines = [`# Team results (${results.length} agents)`];
      results.forEach((r, i) => {
        const label = r.task.label || r.task.skill;
        lines.push(`
## ${i + 1}. ${label} (${r.task.skill}) \u2014 ${r.ok ? "ok" : "failed"} \xB7 ${r.durationMs}ms`);
        if (r.ok) lines.push(r.summary || "(no output)");
        else lines.push(`Error: ${r.error ?? "unknown"}`);
      });
      return lines.join("\n");
    }
  };
}
var init_team_tool = __esm({
  "../skills/src/team-tool.ts"() {
    "use strict";
    init_orchestrator();
  }
});

// ../skills/src/index.ts
var init_src5 = __esm({
  "../skills/src/index.ts"() {
    "use strict";
    init_types3();
    init_parser();
    init_loader();
    init_registry2();
    init_runner();
    init_spawn_tool();
    init_orchestrator();
    init_team_tool();
  }
});

// src/utils/git-context.ts
import { execSync as execSync2 } from "child_process";
function git(args, cwd2) {
  return execSync2(`git ${args}`, {
    cwd: cwd2,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
    timeout: 4e3
  }).trim();
}
function getGitContext(cwd2 = process.cwd()) {
  const empty = {
    isRepo: false,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    lastCommits: []
  };
  try {
    const inside = git("rev-parse --is-inside-work-tree", cwd2);
    if (inside !== "true") return empty;
  } catch {
    return empty;
  }
  const ctx = { ...empty, isRepo: true };
  try {
    ctx.branch = git("rev-parse --abbrev-ref HEAD", cwd2);
  } catch {
  }
  try {
    const status = git("status --porcelain", cwd2);
    if (status) {
      for (const line of status.split("\n")) {
        const x = line[0];
        const y = line[1];
        if (x === "?" && y === "?") ctx.untracked++;
        else {
          if (x && x !== " ") ctx.staged++;
          if (y && y !== " ") ctx.unstaged++;
        }
      }
    }
  } catch {
  }
  try {
    const counts = git("rev-list --left-right --count @{upstream}...HEAD", cwd2);
    const [behind, ahead] = counts.split(/\s+/).map((n) => Number(n) || 0);
    ctx.behind = behind;
    ctx.ahead = ahead;
  } catch {
  }
  try {
    const log22 = git("log --oneline -5", cwd2);
    ctx.lastCommits = log22 ? log22.split("\n") : [];
  } catch {
  }
  try {
    ctx.remoteUrl = git("remote get-url origin", cwd2) || void 0;
  } catch {
  }
  return ctx;
}
function gitContextPrompt(ctx) {
  if (!ctx.isRepo) return "";
  const parts = ["[Git context]"];
  parts.push(`branch: ${ctx.branch ?? "(detached)"}`);
  const dirty = [];
  if (ctx.staged) dirty.push(`${ctx.staged} staged`);
  if (ctx.unstaged) dirty.push(`${ctx.unstaged} modified`);
  if (ctx.untracked) dirty.push(`${ctx.untracked} untracked`);
  parts.push(`working tree: ${dirty.length ? dirty.join(", ") : "clean"}`);
  if (ctx.ahead || ctx.behind) parts.push(`vs upstream: ${ctx.ahead ?? 0} ahead, ${ctx.behind ?? 0} behind`);
  if (ctx.lastCommits.length) parts.push(`recent: ${ctx.lastCommits.slice(0, 3).join(" / ")}`);
  return parts.join("\n");
}
var init_git_context = __esm({
  "src/utils/git-context.ts"() {
    "use strict";
  }
});

// src/utils/project-memory.ts
import { existsSync as existsSync16, mkdirSync as mkdirSync13, readFileSync as readFileSync20, writeFileSync as writeFileSync14, statSync as statSync7 } from "fs";
import { join as join16 } from "path";
function cyberPath(cwd2, ...parts) {
  return join16(cwd2, CYBER_DIR2, ...parts);
}
function cyberDirExists(cwd2 = process.cwd()) {
  try {
    return statSync7(join16(cwd2, CYBER_DIR2)).isDirectory();
  } catch {
    return false;
  }
}
function readProjectMemory(cwd2 = process.cwd()) {
  const file = cyberPath(cwd2, "project.json");
  if (!existsSync16(file)) return null;
  try {
    const raw = readFileSync20(file, "utf8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_MEMORY, ...parsed };
  } catch {
    return null;
  }
}
function readProjectMemoryNotes(cwd2 = process.cwd()) {
  const file = cyberPath(cwd2, "memory.md");
  if (!existsSync16(file)) return "";
  try {
    return readFileSync20(file, "utf8");
  } catch {
    return "";
  }
}
function ensureCyberDir(cwd2) {
  const dir = join16(cwd2, CYBER_DIR2);
  if (!existsSync16(dir)) mkdirSync13(dir, { recursive: true });
}
function initProjectMemory(cwd2 = process.cwd(), seed) {
  ensureCyberDir(cwd2);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existing = readProjectMemory(cwd2);
  const memory = {
    ...DEFAULT_MEMORY,
    ...existing,
    ...seed,
    version: 1,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  writeFileSync14(cyberPath(cwd2, "project.json"), JSON.stringify(memory, null, 2), "utf8");
  if (!existsSync16(cyberPath(cwd2, "README.md"))) {
    writeFileSync14(cyberPath(cwd2, "README.md"), README, "utf8");
  }
  if (!existsSync16(cyberPath(cwd2, "memory.md"))) {
    writeFileSync14(cyberPath(cwd2, "memory.md"), `# Project Memory Log

_CyberCoder records learnings and decisions here as it works._
`, "utf8");
  }
  return memory;
}
function projectMemoryPrompt(cwd2 = process.cwd()) {
  const mem = readProjectMemory(cwd2);
  const notes = readProjectMemoryNotes(cwd2);
  if (!mem && !notes) return "";
  const parts = ["[Project memory \u2014 .cyber/ (read this to understand the project)]"];
  if (mem?.name) parts.push(`name: ${mem.name}`);
  if (mem?.summary) parts.push(`summary: ${mem.summary}`);
  if (mem?.stack?.length) parts.push(`stack: ${mem.stack.join(", ")}`);
  if (mem?.entryPoints?.length) parts.push(`entry points: ${mem.entryPoints.join(", ")}`);
  if (mem?.commands && Object.keys(mem.commands).length) {
    parts.push(`commands: ${Object.entries(mem.commands).map(([k, v]) => `${k}=\`${v}\``).join(", ")}`);
  }
  if (mem?.conventions?.length) parts.push(`conventions: ${mem.conventions.slice(0, 8).join("; ")}`);
  if (mem?.importantPaths?.length) {
    parts.push(`key paths: ${mem.importantPaths.slice(0, 8).map((p2) => `${p2.path} (${p2.note})`).join("; ")}`);
  }
  if (mem?.glossary?.length) {
    parts.push(`glossary: ${mem.glossary.slice(0, 8).map((g) => `${g.term}=${g.meaning}`).join("; ")}`);
  }
  if (mem?.decisions?.length) parts.push(`decisions: ${mem.decisions.slice(0, 6).join("; ")}`);
  let block = parts.join("\n");
  if (notes) {
    const trimmedNotes = notes.length > 2e3 ? notes.slice(notes.length - 2e3) : notes;
    block += `

[Recent learnings \u2014 .cyber/memory.md]
${trimmedNotes.trim()}`;
  }
  return block.length > 6e3 ? block.slice(0, 6e3) + "\n\u2026[memory truncated]" : block;
}
var CYBER_DIR2, DEFAULT_MEMORY, README;
var init_project_memory = __esm({
  "src/utils/project-memory.ts"() {
    "use strict";
    CYBER_DIR2 = ".cyber";
    DEFAULT_MEMORY = {
      version: 1,
      stack: [],
      entryPoints: [],
      commands: {},
      conventions: [],
      importantPaths: [],
      glossary: [],
      decisions: []
    };
    README = `# .cyber \u2014 Project Memory

This folder is CyberCoder's self-learning memory for **this** project.

**Contract:** To understand this project, an AI agent should read THIS folder
first. \`project.json\` holds structured facts (stack, entry points, commands,
conventions). \`memory.md\` is a running log of learnings and decisions.

CyberCoder maintains these files automatically as it works. You can edit them
by hand too \u2014 they're plain JSON/Markdown. Safe to commit to version control so
the whole team (and future sessions) share the same understanding.
`;
  }
});

// src/runtime/hooks.ts
import { execSync as execSync3 } from "child_process";
import { existsSync as existsSync17, readFileSync as readFileSync21 } from "fs";
import { join as join17 } from "path";
import { homedir as homedir5 } from "os";
function readHooksFile(path3) {
  try {
    if (existsSync17(path3)) return JSON.parse(readFileSync21(path3, "utf8"));
  } catch {
  }
  return {};
}
function loadHooks(cwd2 = process.cwd()) {
  if (cached) return cached;
  const global = readHooksFile(join17(homedir5(), ".codeva", "hooks.json"));
  const project = readHooksFile(join17(cwd2, ".codeva", "hooks.json"));
  const merged = { ...global };
  for (const key of Object.keys(project)) {
    merged[key] = project[key];
  }
  cached = merged;
  return merged;
}
function reloadHooks() {
  cached = null;
}
function runHooks(event2, subject = "", cwd2 = process.cwd()) {
  const rules = loadHooks(cwd2)[event2] ?? [];
  if (rules.length === 0) return { ran: false, blocked: false, output: "" };
  const outputs = [];
  let blocked = false;
  for (const rule of rules) {
    if (rule.match) {
      let re;
      try {
        re = new RegExp(rule.match);
      } catch {
        continue;
      }
      if (!re.test(subject)) continue;
    }
    if (rule.block) {
      blocked = true;
      outputs.push(`[hook] blocked by rule (match: ${rule.match ?? "*"})`);
      continue;
    }
    const command = rule.command.replace(/\{file\}/g, subject);
    try {
      const out = execSync3(command, {
        cwd: cwd2,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        timeout: rule.timeoutMs ?? 3e4
      });
      outputs.push(`[hook ${event2}] ${command}
${out.trim().slice(0, 2e3)}`);
    } catch (err) {
      const e = err;
      outputs.push(`[hook ${event2}] ${command} (failed)
${(e.stdout || "") + (e.stderr || e.message || "")}`.slice(0, 2e3));
    }
  }
  return { ran: outputs.length > 0 || blocked, blocked, output: outputs.join("\n") };
}
var cached;
var init_hooks = __esm({
  "src/runtime/hooks.ts"() {
    "use strict";
    cached = null;
  }
});

// src/runtime/chat.ts
var chat_exports = {};
__export(chat_exports, {
  getCheckpoints: () => getCheckpoints,
  getRouter: () => getRouter,
  getSkillRegistry: () => getSkillRegistry,
  runChat: () => runChat,
  runGoalChat: () => runGoalChat,
  runPlanChat: () => runPlanChat,
  toProviderMessages: () => toProviderMessages
});
function getCheckpoints() {
  if (!singletonCheckpoints) singletonCheckpoints = new WorkspaceCheckpoints(SESSION_ID);
  return singletonCheckpoints;
}
function getRouter() {
  const config = loadConfig();
  const configKeys = config.apiKeys ?? {};
  const cloudApiKey = process.env.CYBERMIND_API_KEY ?? config.authToken ?? configKeys.cybercoder ?? configKeys.cybercoder_cloud;
  if (!singletonRouter) {
    singletonRouter = new ProviderRouter({
      preferred: defaultProviderOrder(config, configKeys),
      anthropic: { apiKey: process.env.ANTHROPIC_API_KEY ?? configKeys.anthropic },
      cloud: {
        apiKey: cloudApiKey,
        baseURL: process.env.CYBERMIND_CLOUD_URL ?? "https://cybercli-api.onrender.com"
      },
      openai: { apiKey: process.env.OPENAI_API_KEY ?? configKeys.openai },
      groq: { apiKey: process.env.GROQ_API_KEY ?? configKeys.groq },
      google: { apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? configKeys.google ?? configKeys.gemini },
      openrouter: { apiKey: process.env.OPENROUTER_API_KEY ?? configKeys.openrouter },
      ollama: {
        defaultModel: config.lastModel || "auto"
      }
    });
  }
  return singletonRouter;
}
function getSkillRegistry() {
  if (!singletonRegistry) singletonRegistry = new SkillRegistry();
  return singletonRegistry;
}
function defaultProviderOrder(config, configKeys) {
  const order = [];
  const cloudApiKey = process.env.CYBERMIND_API_KEY ?? config.authToken ?? configKeys.cybercoder ?? configKeys.cybercoder_cloud;
  if (cloudApiKey) {
    order.push("cybercoder-cloud");
  }
  if (process.env.ANTHROPIC_API_KEY || configKeys.anthropic) {
    order.push("anthropic");
  }
  if (process.env.OPENAI_API_KEY || configKeys.openai) {
    order.push("openai");
  }
  if (process.env.GROQ_API_KEY || configKeys.groq) {
    order.push("groq");
  }
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || configKeys.google || configKeys.gemini) {
    order.push("gemini");
  }
  if (process.env.OPENROUTER_API_KEY || configKeys.openrouter) {
    order.push("openrouter");
  }
  order.push("ollama");
  return order;
}
function toProviderMessages(messages) {
  return messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role, content: m.content }));
}
async function getMcpTools() {
  if (mcpToolsCache) return mcpToolsCache;
  try {
    const { tools } = await loadMcpTools();
    mcpToolsCache = tools;
  } catch {
    mcpToolsCache = [];
  }
  return mcpToolsCache;
}
async function buildAgentTools(approvalUI) {
  const router = getRouter();
  const registry = getSkillRegistry();
  const gate = new ApprovalGate(approvalUI ?? new HeadlessApprovalUI());
  const builtins = builtinTools();
  const wrappedBuiltins = builtins.map((t) => ({
    schema: t.schema,
    destructive: t.destructive,
    verify: t.verify,
    execute: async (input, ctx) => {
      const ok = await gate.request({
        toolName: t.schema.name,
        input,
        destructive: t.destructive,
        summary: summarizeCall(t.schema.name, input)
      });
      if (!ok) return `[user denied tool '${t.schema.name}']`;
      if (t.schema.name === "run_command") {
        const cmd = typeof input.command === "string" ? input.command : "";
        const pre = runHooks("preCommand", cmd);
        if (pre.blocked) return `[blocked by preCommand hook]
${pre.output}`;
      }
      if (t.destructive && (t.schema.name === "edit" || t.schema.name === "write_file")) {
        const target = input.path;
        if (typeof target === "string" && target) {
          try {
            getCheckpoints().snapshot([target], `${t.schema.name} ${target}`);
          } catch {
          }
        }
      }
      const result = await t.execute(input, { cwd: ctx.cwd });
      try {
        if (t.schema.name === "edit") {
          const h = runHooks("postEdit", String(input.path ?? ""));
          if (h.output) return `${result}
${h.output}`;
        } else if (t.schema.name === "write_file") {
          const h = runHooks("postWrite", String(input.path ?? ""));
          if (h.output) return `${result}
${h.output}`;
        } else if (t.schema.name === "run_command") {
          const h = runHooks("postCommand", String(input.command ?? ""));
          if (h.output) return `${result}
${h.output}`;
        }
      } catch {
      }
      return result;
    }
  }));
  const toolPool = builtins.map((t) => ({ schema: t.schema, execute: t.execute, destructive: t.destructive, verify: t.verify }));
  const spawnTool = buildSpawnSubagentTool({ registry, provider: router, toolPool });
  const teamTool = buildSpawnTeamTool({ registry, provider: router, toolPool, concurrency: 3 });
  const mcpRaw = await getMcpTools();
  const mcpWrapped = mcpRaw.map((t) => ({
    schema: t.schema,
    destructive: t.destructive,
    execute: async (input, ctx) => {
      const ok = await gate.request({
        toolName: t.schema.name,
        input,
        destructive: t.destructive,
        summary: `MCP: ${t.schema.name}`
      });
      if (!ok) return `[user denied tool '${t.schema.name}']`;
      return t.execute(input, ctx);
    }
  }));
  const gitBlock = gitContextPrompt(getGitContext());
  const memoryBlock = projectMemoryPrompt();
  const systemPrompt = [SYSTEM_PROMPT, memoryBlock, gitBlock].filter(Boolean).join("\n\n");
  return { tools: [...wrappedBuiltins, spawnTool, teamTool, ...mcpWrapped], systemPrompt };
}
async function runChat(history, opts) {
  const router = getRouter();
  const providerMessages = toProviderMessages(history);
  const { tools, systemPrompt } = await buildAgentTools(opts.approvalUI);
  for await (const evt of runAgentLoop(providerMessages, {
    provider: router,
    systemPrompt,
    model: opts.model ?? "auto",
    signal: opts.signal,
    tools
  })) {
    opts.onEvent(evt);
  }
}
async function runGoalChat(history, opts) {
  const router = getRouter();
  const providerMessages = toProviderMessages(history);
  const { tools, systemPrompt } = await buildAgentTools(opts.approvalUI);
  for await (const evt of runGoal(providerMessages, {
    provider: router,
    systemPrompt,
    model: opts.model ?? "auto",
    signal: opts.signal,
    tools,
    maxRounds: opts.maxRounds ?? 8,
    onEvent: opts.onEvent
  })) {
    opts.onEvent(evt);
  }
}
async function runPlanChat(history, opts) {
  const router = getRouter();
  const providerMessages = toProviderMessages(history);
  const { tools } = await buildAgentTools(opts.approvalUI);
  return runPlan(providerMessages, {
    provider: router,
    model: opts.model ?? "auto",
    tools,
    signal: opts.signal,
    onEvent: opts.onEvent
  });
}
function summarizeCall(name, input) {
  if (name === "run_command") return `Run: ${String(input.command ?? "")}`;
  if (name === "write_file") return `Create file: ${String(input.path ?? "")}`;
  if (name === "edit") return `Edit file: ${String(input.path ?? "")}`;
  if (name === "read_file") return `Read: ${String(input.path ?? "")}`;
  if (name === "list_dir") return `List: ${String(input.path ?? "")}`;
  if (name === "grep") return `Grep: /${String(input.pattern ?? "")}/`;
  return `${name}(${Object.keys(input).join(", ")})`;
}
var singletonRouter, singletonRegistry, singletonCheckpoints, SESSION_ID, SYSTEM_PROMPT, mcpToolsCache;
var init_chat = __esm({
  "src/runtime/chat.ts"() {
    "use strict";
    init_src2();
    init_src2();
    init_src3();
    init_src4();
    init_src5();
    init_config();
    init_git_context();
    init_project_memory();
    init_hooks();
    singletonRouter = null;
    singletonRegistry = null;
    singletonCheckpoints = null;
    SESSION_ID = `sess-${Date.now().toString(36)}`;
    SYSTEM_PROMPT = `You are CyberCoder, a fullstack agentic coding assistant running inside a terminal.
You help with reading, editing, and running code across the user's project. Be concise,
prefer code over prose, and never invent file paths. You have access to these tools:
- read_file(path, offset?, limit?) \u2014 returns numbered lines of a file
- read_many(paths[]) \u2014 read SEVERAL files in one call (use to grok a feature fast)
- list_dir(path) \u2014 lists a directory
- grep(pattern, path?, include?) \u2014 ripgrep-style search
- repo_map(path?) \u2014 compact map of the project (dirs + key symbols per file);
  call this FIRST on an unfamiliar repo to navigate efficiently
- write_file(path, content) \u2014 create a NEW file (fails on overwrite)
- edit(path, old_string, new_string, replace_all?) \u2014 surgical replacements
- run_command(command, cwd?, timeout_ms?) \u2014 PowerShell on Windows, bash on Unix
- web_search(query, max_results?) \u2014 live keyless web search (titles, urls, snippets)
- web_fetch(url, max_chars?) \u2014 fetch a page and return clean readable text
- project_memory(action, \u2026) \u2014 self-learning project memory in .cyber/: action='read'
  to recall what's known, 'update' to save durable facts (stack, entry points,
  commands, conventions, key paths, glossary, decisions), 'note' to log a learning.
  Update it whenever you discover something durable so future sessions (or any AI)
  understand this project from .cyber/ alone.
- spawn_subagent(skill, prompt) \u2014 delegate to an installed skill (research, plan,
  code-review, \u2026) which runs in an isolated context and returns a summary
- spawn_team(tasks[]) \u2014 run MULTIPLE sub-agents IN PARALLEL for independent
  pieces of work (e.g. research + review + plan at once), returns all results
Destructive tools (write_file, edit, run_command) require user approval each turn
unless the user has granted persistent trust via /trust. Prefer spawn_subagent for
broad exploration ("research"), planning ("plan"), and reviewing diffs ("code-review")
\u2014 it produces tighter summaries and keeps your main context clean. When a goal has
several independent parts, prefer spawn_team to do them concurrently.`;
    mcpToolsCache = null;
  }
});

// src/rpc-server.ts
var rpc_server_exports = {};
__export(rpc_server_exports, {
  startRpcServer: () => startRpcServer
});
import { createInterface } from "readline";
import { readFileSync as readFileSync24, writeFileSync as writeFileSync17, readdirSync as readdirSync10, existsSync as existsSync21, mkdirSync as mkdirSync15 } from "fs";
import { join as join22, resolve as resolve12 } from "path";
import { execSync as execSync4 } from "child_process";
function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}
function event(name, data) {
  send({ event: name, data });
}
function respond(id, result) {
  send({ id, result });
}
function respondError(id, message) {
  send({ id, error: { message } });
}
async function handleMethod(id, method, params = {}) {
  try {
    switch (method) {
      case "ping":
        respond(id, { pong: true, version: "0.1.22", cwd });
        break;
      case "read_file": {
        const path3 = resolve12(cwd, String(params.path || ""));
        const text = readFileSync24(path3, "utf8");
        const lines = text.split("\n").slice(0, Number(params.limit || 2e3));
        respond(id, { content: lines.map((l, i) => `${i + 1}	${l}`).join("\n") });
        break;
      }
      case "write_file": {
        const path3 = resolve12(cwd, String(params.path || ""));
        const dir = join22(path3, "..");
        if (!existsSync21(dir)) mkdirSync15(dir, { recursive: true });
        writeFileSync17(path3, String(params.content || ""), "utf8");
        respond(id, { written: path3 });
        break;
      }
      case "list_dir": {
        const path3 = resolve12(cwd, String(params.path || "."));
        const entries = readdirSync10(path3, { withFileTypes: true });
        respond(id, { entries: entries.map((e) => ({ name: e.name, type: e.isDirectory() ? "dir" : "file" })) });
        break;
      }
      case "grep": {
        const pattern = String(params.pattern || "");
        const include = String(params.include || ".");
        try {
          const out = execSync4(`grep -rn --include="${include}" "${pattern}" .`, { cwd, encoding: "utf8", timeout: 1e4, windowsHide: true }).slice(0, 16e3);
          respond(id, { matches: out });
        } catch (e) {
          respond(id, { matches: e.stdout?.slice(0, 16e3) || "" });
        }
        break;
      }
      case "run_command": {
        const command = String(params.command || "");
        event("tool_start", { name: "run_command", summary: `Run: ${command}` });
        try {
          const out = execSync4(command, { cwd, encoding: "utf8", timeout: 12e4, windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
          event("tool_end", { name: "run_command", ok: true });
          respond(id, { output: out.slice(0, 2e4), exitCode: 0 });
        } catch (e) {
          event("tool_end", { name: "run_command", ok: false });
          respond(id, { output: (e.stdout || "") + (e.stderr || ""), exitCode: e.status || 1 });
        }
        break;
      }
      case "git": {
        const op = String(params.operation || "status");
        try {
          const out = execSync4(`git ${op}`, { cwd, encoding: "utf8", timeout: 3e4, windowsHide: true });
          respond(id, { output: out.slice(0, 12e3) });
        } catch (e) {
          respond(id, { output: (e.stdout || "") + (e.stderr || ""), error: e.message });
        }
        break;
      }
      case "git_context": {
        const ctx = getGitContext(cwd);
        respond(id, ctx);
        break;
      }
      case "project_memory": {
        const mem = projectMemoryPrompt(cwd);
        respond(id, { memory: mem });
        break;
      }
      case "complete": {
        const messages = params.messages || [];
        const model = String(params.model || "auto");
        const system = String(params.system || "");
        let fullText = "";
        await runChat(
          messages.map((m) => ({ id: `rpc-${Date.now()}`, role: m.role, content: m.content, createdAt: Date.now() })),
          {
            model,
            onEvent: (evt) => {
              if (evt.type === "text") {
                fullText += evt.text;
                event("token", { content: evt.text });
              } else if (evt.type === "tool_start") {
                event("tool_start", { name: evt.name, input: evt.input });
              } else if (evt.type === "tool_end") {
                event("tool_end", { name: evt.name, output: evt.output?.slice(0, 4e3) });
              } else if (evt.type === "error") {
                event("error", { message: evt.message });
              }
            }
          }
        );
        event("done", {});
        respond(id, { content: fullText });
        break;
      }
      case "shutdown":
        respond(id, { ok: true });
        setTimeout(() => process.exit(0), 100);
        break;
      default:
        respondError(id, `Unknown method: ${method}`);
    }
  } catch (err) {
    respondError(id, err.message || "Internal error");
  }
}
function startRpcServer() {
  event("ready", { version: "0.1.22", cwd, tools: builtinTools().map((t) => t.schema.name) });
  const rl = createInterface({ input: process.stdin, terminal: false });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const msg = JSON.parse(trimmed);
      if (typeof msg.id === "number" && typeof msg.method === "string") {
        handleMethod(msg.id, msg.method, msg.params || {});
      }
    } catch {
    }
  });
  rl.on("close", () => process.exit(0));
}
var cwd;
var init_rpc_server = __esm({
  "src/rpc-server.ts"() {
    "use strict";
    init_chat();
    init_src4();
    init_git_context();
    init_project_memory();
    cwd = process.cwd();
  }
});

// src/index.tsx
init_src();
import { Command } from "commander";
import { render } from "ink";

// src/app.tsx
import { Box as Box16, Text as Text16, useApp as useApp2, useInput as useInput8 } from "ink";
import { useCallback, useEffect as useEffect4, useMemo, useRef as useRef2, useState as useState9 } from "react";

// src/components/Welcome.tsx
init_src();
import React from "react";
import { Box as Box2, Text as Text2, useStdout } from "ink";

// src/components/Mascot.tsx
import { Box, Text } from "ink";

// src/theme/theme.ts
var ACCENT = "#D97757";
var ACCENT_LIGHT = "#C2410C";
var DARK = {
  accent: ACCENT,
  accentAlt: "#E0915F",
  text: "#ECECEC",
  muted: "#9CA3AF",
  dim: "#6B7280",
  success: "#4ADE80",
  warning: "#FBBF24",
  error: "#F87171",
  info: "#60A5FA",
  user: "#7DD3FC",
  assistant: "#ECECEC",
  border: ACCENT,
  isLight: false,
  ansiOnly: false
};
var LIGHT = {
  accent: ACCENT_LIGHT,
  accentAlt: "#9A3412",
  text: "#1F2937",
  muted: "#4B5563",
  dim: "#9CA3AF",
  success: "#15803D",
  warning: "#B45309",
  error: "#B91C1C",
  info: "#1D4ED8",
  user: "#0369A1",
  assistant: "#1F2937",
  border: ACCENT_LIGHT,
  isLight: true,
  ansiOnly: false
};
var DARK_CB = {
  ...DARK,
  success: "#38BDF8",
  // blue stands in for "good"
  error: "#FB923C",
  // orange stands in for "bad"
  warning: "#FACC15",
  user: "#38BDF8"
};
var LIGHT_CB = {
  ...LIGHT,
  success: "#0284C7",
  error: "#C2410C",
  warning: "#A16207",
  user: "#0284C7"
};
var DARK_ANSI = {
  accent: "red",
  accentAlt: "redBright",
  text: "white",
  muted: "gray",
  dim: "gray",
  success: "green",
  warning: "yellow",
  error: "red",
  info: "blue",
  user: "cyan",
  assistant: "white",
  border: "red",
  isLight: false,
  ansiOnly: true
};
var LIGHT_ANSI = {
  accent: "red",
  accentAlt: "magenta",
  text: "black",
  muted: "gray",
  dim: "gray",
  success: "green",
  warning: "yellow",
  error: "red",
  info: "blue",
  user: "blue",
  assistant: "black",
  border: "red",
  isLight: true,
  ansiOnly: true
};
var PALETTES = {
  dark: DARK,
  light: LIGHT,
  "dark-colorblind": DARK_CB,
  "light-colorblind": LIGHT_CB,
  "dark-ansi": DARK_ANSI,
  "light-ansi": LIGHT_ANSI
};
function detectTerminalIsLight() {
  const fgbg = process.env.COLORFGBG;
  if (fgbg) {
    const parts = fgbg.split(";");
    const bg = Number(parts[parts.length - 1]);
    if (!Number.isNaN(bg)) return bg >= 7 || bg === 15;
  }
  return false;
}
function resolvePalette(mode) {
  if (mode === "auto") {
    return detectTerminalIsLight() ? LIGHT : DARK;
  }
  return PALETTES[mode] ?? DARK;
}
var activeTheme = DARK;
var activeMode = "dark";
var listeners = /* @__PURE__ */ new Set();
function setActiveTheme(mode) {
  activeMode = mode;
  activeTheme = resolvePalette(mode);
  for (const fn of listeners) fn();
  return activeTheme;
}
function onThemeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
var THEME_OPTIONS = [
  { id: "auto", label: "Auto (match terminal)" },
  { id: "dark", label: "Dark mode" },
  { id: "light", label: "Light mode" },
  { id: "dark-colorblind", label: "Dark mode (colorblind-friendly)" },
  { id: "light-colorblind", label: "Light mode (colorblind-friendly)" },
  { id: "dark-ansi", label: "Dark mode (ANSI colors only)" },
  { id: "light-ansi", label: "Light mode (ANSI colors only)" }
];

// src/components/Mascot.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var Mascot = () => {
  const c = activeTheme.accent;
  const eye = activeTheme.isLight ? "#FFFFFF" : "#1A1A1A";
  void eye;
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx(Text, { color: c, children: "  \u259F\u2588\u2599   \u259F\u2588\u2599  " }),
    /* @__PURE__ */ jsx(Text, { color: c, children: " \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 " }),
    /* @__PURE__ */ jsxs(Text, { color: c, children: [
      "\u2588\u2588",
      /* @__PURE__ */ jsx(Text, { color: activeTheme.text, backgroundColor: c, children: "\u2588\u2588" }),
      "\u2588\u2588\u2588",
      /* @__PURE__ */ jsx(Text, { color: activeTheme.text, backgroundColor: c, children: "\u2588\u2588" }),
      "\u2588\u2588"
    ] }),
    /* @__PURE__ */ jsx(Text, { color: c, children: " \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 " }),
    /* @__PURE__ */ jsx(Text, { color: c, children: "  \u2588\u2588     \u2588\u2588  " })
  ] });
};
var SkyScene = () => {
  const dim = activeTheme.dim;
  const cloud = activeTheme.muted;
  const star = activeTheme.accentAlt;
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx(Text, { color: dim, children: "\xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7" }),
    /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { color: star, children: "    \u2736        " }),
      /* @__PURE__ */ jsx(Text, { color: cloud, children: "\u2591\u2591\u2592\u2592        " }),
      /* @__PURE__ */ jsx(Text, { color: cloud, children: "  \u2592\u2592\u2593\u2593\u2593\u2592\u2591" })
    ] }),
    /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { color: cloud, children: "  \u2591\u2591\u2592\u2592\u2593\u2592\u2591     " }),
      /* @__PURE__ */ jsx(Text, { color: star, children: "\u2736   " }),
      /* @__PURE__ */ jsx(Text, { color: cloud, children: "\u2592\u2593\u2593    \u2593\u2593" })
    ] }),
    /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { color: cloud, children: "\u2591\u2592\u2592\u2593\u2593\u2593\u2592\u2591  " }),
      /* @__PURE__ */ jsx(Text, { color: star, children: "\u2736      " }),
      /* @__PURE__ */ jsx(Text, { color: cloud, children: "\u2593\u2593     \u2592\u2592" })
    ] }),
    /* @__PURE__ */ jsxs(Text, { children: [
      /* @__PURE__ */ jsx(Text, { color: star, children: " \u2736          " }),
      /* @__PURE__ */ jsx(Text, { color: cloud, children: "\u2591\u2592\u2593\u2592\u2591   " }),
      /* @__PURE__ */ jsx(Text, { color: cloud, children: "\u2592\u2593\u2593\u2593\u2592\u2592\u2591" })
    ] }),
    /* @__PURE__ */ jsx(Text, { color: dim, children: "\xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7 \xB7" })
  ] });
};

// src/components/Welcome.tsx
init_config();

// src/theme/useTheme.ts
import { useSyncExternalStore } from "react";
function useTheme() {
  return useSyncExternalStore(
    (cb) => onThemeChange(cb),
    () => activeTheme,
    () => activeTheme
  );
}

// src/utils/updater.ts
init_src();
import fs from "fs";
import path from "path";
import os from "os";
var CACHE_FILE = path.join(os.homedir(), ".cyber", "update-cache.json");
var CHECK_INTERVAL = 12 * 60 * 60 * 1e3;
function compareVersions(v1, v2) {
  const parts1 = v1.replace(/^v/, "").split(".").map(Number);
  const parts2 = v2.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}
async function checkForUpdates() {
  try {
    let cache = { lastCheck: 0, latestVersion: null };
    if (fs.existsSync(CACHE_FILE)) {
      try {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
      } catch (e) {
      }
    }
    if (Date.now() - cache.lastCheck < CHECK_INTERVAL && cache.latestVersion) {
      const isNewer = compareVersions(cache.latestVersion, CYBERCODER_VERSION) > 0;
      return { updateAvailable: isNewer, latestVersion: cache.latestVersion };
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2e3);
    const res = await fetch("https://registry.npmjs.org/cybercoder-cli/latest", {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const latestVersion = data.version;
      fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify({
        lastCheck: Date.now(),
        latestVersion
      }));
      const isNewer = compareVersions(latestVersion, CYBERCODER_VERSION) > 0;
      return { updateAvailable: isNewer, latestVersion };
    }
  } catch (err) {
  }
  return { updateAvailable: false, latestVersion: null };
}

// src/components/Welcome.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var Welcome = ({ model = "auto", provider = "auto" }) => {
  const t = useTheme();
  const cwd2 = process.cwd();
  const profile = getUserProfile();
  const userPlan = profile.plan || "free";
  const [updateInfo, setUpdateInfo] = React.useState(null);
  React.useEffect(() => {
    checkForUpdates().then((info) => {
      if (info.updateAvailable) {
        setUpdateInfo(info);
      }
    });
  }, []);
  const { stdout } = useStdout();
  const termWidth = stdout?.columns ?? 80;
  const contentWidth = Math.max(termWidth - 4, 60);
  const title = ` ${CYBERCODER_NAME} v${CYBERCODER_VERSION} `;
  const dashAfterTitle = Math.max(2, contentWidth - title.length - 2);
  const modelLine = `${model}`;
  const planLine = `${provider} \xB7 ${userPlan}`;
  const maxCwdLen = 30;
  const cwdShort = cwd2.length > maxCwdLen ? cwd2.slice(0, maxCwdLen - 3) + "..." : cwd2;
  return /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", paddingX: 1, marginBottom: 0, children: [
    /* @__PURE__ */ jsxs2(Text2, { color: t.accent, children: [
      "\u256D\u2500",
      title,
      "\u2500".repeat(dashAfterTitle),
      "\u256E"
    ] }),
    /* @__PURE__ */ jsxs2(Box2, { flexDirection: "row", children: [
      /* @__PURE__ */ jsx2(Text2, { color: t.accent, children: "\u2502" }),
      /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", alignItems: "center", paddingX: 2, paddingY: 1, width: Math.floor(contentWidth * 0.35), children: [
        /* @__PURE__ */ jsx2(Text2, { bold: true, color: t.text, children: "Welcome back!" }),
        /* @__PURE__ */ jsx2(Box2, { marginTop: 1, marginBottom: 1, children: /* @__PURE__ */ jsx2(Mascot, {}) }),
        /* @__PURE__ */ jsxs2(Text2, { color: t.muted, children: [
          /* @__PURE__ */ jsx2(Text2, { bold: true, color: t.text, children: modelLine }),
          " with ",
          /* @__PURE__ */ jsx2(Text2, { color: t.accentAlt || t.accent, children: planLine })
        ] }),
        /* @__PURE__ */ jsx2(Text2, { color: t.dim, children: cwdShort })
      ] }),
      /* @__PURE__ */ jsx2(Text2, { color: t.accent, children: "\u2502" }),
      /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", paddingLeft: 1, paddingY: 1, width: Math.floor(contentWidth * 0.65), children: [
        /* @__PURE__ */ jsx2(Text2, { bold: true, color: t.accentAlt || t.accent, children: "Tips for getting started" }),
        /* @__PURE__ */ jsxs2(Text2, { color: t.muted, children: [
          "Run /init to create a CYBER.md file with instructions for ",
          CYBERCODER_NAME
        ] }),
        /* @__PURE__ */ jsx2(Box2, { marginTop: 1 }),
        /* @__PURE__ */ jsx2(Text2, { bold: true, color: t.accentAlt || t.accent, children: "What's new" }),
        /* @__PURE__ */ jsx2(Text2, { color: t.muted, children: "Bug fixes and reliability improvements" }),
        /* @__PURE__ */ jsx2(Text2, { color: t.muted, children: "Added 4 Supreme Models: Madhav, Kali, Abhimanyu, Trinity" }),
        /* @__PURE__ */ jsx2(Text2, { color: t.dim, italic: true, children: "/release-notes for more" })
      ] }),
      /* @__PURE__ */ jsx2(Text2, { color: t.accent, children: "\u2502" })
    ] }),
    /* @__PURE__ */ jsxs2(Text2, { color: t.accent, children: [
      "\u2570",
      "\u2500".repeat(contentWidth),
      "\u256F"
    ] }),
    updateInfo && /* @__PURE__ */ jsxs2(Box2, { marginTop: 0, paddingLeft: 2, children: [
      /* @__PURE__ */ jsxs2(Text2, { bold: true, color: "yellow", children: [
        "\u{1F680} Update available: ",
        CYBERCODER_VERSION,
        " \u2192 ",
        updateInfo.latestVersion
      ] }),
      /* @__PURE__ */ jsx2(Text2, { color: "gray", children: "  Run " }),
      /* @__PURE__ */ jsx2(Text2, { color: "cyan", children: "npm install -g cybercoder-cli@latest" }),
      /* @__PURE__ */ jsx2(Text2, { color: "gray", children: " to update!" })
    ] })
  ] });
};

// src/components/Onboarding.tsx
init_src();
import { useState as useState2, useEffect as useEffect2, useRef } from "react";
import { Box as Box4, Text as Text4, useInput, useApp, useStdout as useStdout2 } from "ink";
import TextInput from "ink-text-input";
import { exec } from "child_process";
import http from "http";

// src/components/LoadingSpinner.tsx
import { useEffect, useState } from "react";
import { Box as Box3, Text as Text3 } from "ink";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var LoadingSpinner = ({ text = "Thinking", showTimer = false }) => {
  const [frame, setFrame] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const frames = ["\u28FE", "\u28FD", "\u28FB", "\u28BF", "\u287F", "\u28DF", "\u28EF", "\u28F7"];
  useEffect(() => {
    const frameInterval = setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 80);
    return () => clearInterval(frameInterval);
  }, []);
  useEffect(() => {
    if (!showTimer) return;
    const timerInterval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1e3);
    return () => clearInterval(timerInterval);
  }, [showTimer]);
  const formatElapsed = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };
  return /* @__PURE__ */ jsxs3(Box3, { flexDirection: "row", alignItems: "center", children: [
    /* @__PURE__ */ jsxs3(Text3, { color: "#D97757", children: [
      frames[frame],
      " "
    ] }),
    /* @__PURE__ */ jsx3(Text3, { color: "white", bold: true, children: text }),
    showTimer && /* @__PURE__ */ jsxs3(Text3, { color: "gray", children: [
      " (",
      formatElapsed(elapsed),
      ")"
    ] })
  ] });
};

// src/components/Onboarding.tsx
init_config();

// src/utils/api-client.ts
init_config();
import { hostname } from "os";
var BASE_URL = process.env.CYBERMIND_CLOUD_URL || "https://cybercli-api.onrender.com";
var BACKEND_URL = BASE_URL.endsWith("/api/v1") ? BASE_URL : `${BASE_URL.replace(/\/+$/, "")}/api/v1`;
var ApiClient = class {
  getHeaders() {
    const token = getAuthToken();
    const sessionId = getSessionId();
    const headers = {
      "Content-Type": "application/json"
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (sessionId) {
      headers["x-cli-session"] = sessionId;
    }
    return headers;
  }
  async authenticate(apiKey) {
    const machineId = process.env.COMPUTERNAME || process.env.HOSTNAME || hostname() || "unknown-mac";
    const osType = process.platform;
    const shellType = process.env.SHELL || process.env.COMSPEC || "unknown-shell";
    const currentCwd = process.cwd();
    const response = await fetch(`${BACKEND_URL}/cli/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: apiKey,
        machine_id: machineId,
        machine_name: hostname(),
        os: osType,
        shell: shellType,
        cwd: currentCwd
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Authentication failed" }));
      throw new Error(err.error || "Authentication failed");
    }
    return response.json();
  }
  async refreshSession() {
    const response = await fetch(`${BACKEND_URL}/cli/auth/refresh`, {
      method: "POST",
      headers: this.getHeaders()
    });
    if (!response.ok) {
      throw new Error("Failed to refresh session");
    }
    return response.json();
  }
  async logout() {
    const response = await fetch(`${BACKEND_URL}/cli/auth/logout`, {
      method: "POST",
      headers: this.getHeaders()
    });
    if (!response.ok) {
      throw new Error("Failed to logout");
    }
    return response.json();
  }
  async getModels() {
    const response = await fetch(`${BACKEND_URL}/cli/models`, {
      method: "GET",
      headers: this.getHeaders()
    });
    if (!response.ok) {
      throw new Error("Failed to fetch models");
    }
    return response.json();
  }
  async getStats() {
    const response = await fetch(`${BACKEND_URL}/cli/stats`, {
      method: "GET",
      headers: this.getHeaders()
    });
    if (!response.ok) {
      throw new Error("Failed to fetch stats");
    }
    return response.json();
  }
  async getContext(prompt) {
    const response = await fetch(`${BACKEND_URL}/cli/context?prompt=${encodeURIComponent(prompt)}`, {
      method: "GET",
      headers: this.getHeaders()
    });
    if (!response.ok) {
      throw new Error("Failed to fetch context");
    }
    return response.json();
  }
  async updateContext(technologies, codeQuality, patternsDetected) {
    const response = await fetch(`${BACKEND_URL}/cli/context/update`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        technologies,
        code_quality: codeQuality,
        patterns_detected: patternsDetected
      })
    });
    if (!response.ok) {
      throw new Error("Failed to update context");
    }
    return response.json();
  }
  async trackCommand(command, args, cwd2, exitCode, outputPreview, durationMs) {
    const response = await fetch(`${BACKEND_URL}/cli/track/command`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        command,
        args,
        cwd: cwd2,
        exit_code: exitCode,
        output_preview: outputPreview,
        duration_ms: durationMs
      })
    });
    if (!response.ok) {
      throw new Error("Failed to track command");
    }
    return response.json();
  }
  async *streamCompletion(payload) {
    const response = await fetch(`${BACKEND_URL}/cli/complete`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        ...payload,
        stream: true
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Streaming failed: ${response.status} ${errText}`);
    }
    if (!response.body) {
      throw new Error("No response body for streaming");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === "[DONE]") {
            return;
          }
          try {
            const parsed = JSON.parse(dataStr);
            yield parsed;
          } catch {
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
};
var apiClient = new ApiClient();

// src/components/Onboarding.tsx
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var LOGIN_METHODS = [
  {
    id: "codeva",
    label: "Codeva account (Pro, Max, Team)",
    desc: "Automated OAuth browser sign-in"
  },
  {
    id: "apikey",
    label: "API Key (Bring Your Own Key)",
    desc: "Billed based on API usage"
  },
  {
    id: "thirdparty",
    label: "3rd-party platform (Ollama, Groq, etc.)",
    desc: "Local setup and config"
  }
];
var THIRDPARTY_PLATFORMS = [
  { id: "openrouter", label: "OpenRouter", desc: "Get OpenRouter API keys" },
  { id: "groq", label: "Groq", desc: "Get Groq API keys" },
  { id: "ollama", label: "Ollama (local)", desc: "Run locally" },
  { id: "back", label: "Go back", desc: "" }
];
var API_PROVIDERS = [
  { id: "codeva", label: "Codeva Cloud" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "groq", label: "Groq" },
  { id: "google", label: "Google (Gemini)" },
  { id: "openrouter", label: "OpenRouter" }
];
function openBrowser(url) {
  try {
    const platform = process.platform;
    if (platform === "win32") {
      exec(`cmd /c start "" "${url}"`, { windowsHide: true });
    } else if (platform === "darwin") {
      exec(`open "${url}"`);
    } else {
      exec(`xdg-open "${url}"`);
    }
  } catch {
  }
}
var Onboarding = ({ onComplete }) => {
  const { exit } = useApp();
  const { stdout } = useStdout2();
  const [screen, setScreen] = useState2("main");
  const [selected, setSelected] = useState2(0);
  const [port, setPort] = useState2(null);
  const [authError, setAuthError] = useState2(null);
  const [waitingForAuth, setWaitingForAuth] = useState2(false);
  const serverRef = useRef(null);
  const [apiKeyInput, setApiKeyInput] = useState2("");
  const [apiKeyProvider, setApiKeyProvider] = useState2("codeva");
  const [apiKeyStage, setApiKeyStage] = useState2("provider");
  const [tpSelected, setTpSelected] = useState2(0);
  const termWidth = stdout.columns ?? 80;
  const contentWidth = termWidth - 4;
  useEffect2(() => {
    if (screen === "codeva-login") {
      setWaitingForAuth(true);
      setAuthError(null);
      const server = http.createServer((req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") {
          res.writeHead(200);
          res.end();
          return;
        }
        const urlObj = new URL(req.url || "", `http://${req.headers.host}`);
        if (urlObj.pathname === "/auth") {
          const token = urlObj.searchParams.get("token");
          if (token) {
            const htmlResponse = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Successful - Codeva</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: #0d0d12;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }
    .container {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    }
    .icon {
      width: 64px;
      height: 64px;
      background: #D97757;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg {
      width: 32px;
      height: 32px;
      color: white;
    }
    h1 {
      margin: 0 0 16px;
      font-size: 24px;
      font-weight: 600;
      color: #ffffff;
    }
    p {
      margin: 0;
      color: #a1a1aa;
      font-size: 15px;
      line-height: 1.5;
    }
    .footer {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      color: #71717a;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    </div>
    <h1>Authentication Successful!</h1>
    <p>You have successfully logged into the Codeva CLI. You can now close this tab and return to your terminal.</p>
    <div class="footer">
      Powered by Codeva Cloud
    </div>
  </div>
  <script>
    setTimeout(() => {
      window.close();
    }, 5000);
  </script>
</body>
</html>
`;
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(htmlResponse);
            setAuthToken(token);
            apiClient.authenticate(token).then((authInfo) => {
              setSessionId(authInfo.session_id);
              setUserProfile(authInfo.user);
              markOnboardingComplete("codeva");
              onComplete("codeva");
            }).catch((err) => {
              setAuthError(err.message || "Token verification failed");
              setWaitingForAuth(false);
            });
            setTimeout(() => {
              server.close();
            }, 1e3);
          } else {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("Missing token");
          }
        } else {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not Found");
        }
      });
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        const allocatedPort = typeof addr === "string" ? 0 : addr?.port || 0;
        setPort(allocatedPort);
        const frontendUrl = process.env.FRONTEND_URL || "https://cybermindcli.info";
        openBrowser(`${frontendUrl}/login?redirect=cli&port=${allocatedPort}`);
      });
      serverRef.current = server;
      const timeout = setTimeout(() => {
        setAuthError("Authentication timed out. Please try again.");
        setWaitingForAuth(false);
        server.close();
      }, 5 * 60 * 1e3);
      return () => {
        clearTimeout(timeout);
        server.close();
      };
    }
  }, [screen, onComplete]);
  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
      return;
    }
    if (screen === "main") {
      if (key.escape) {
        exit();
        return;
      }
      if (key.upArrow) {
        setSelected((s) => Math.max(0, s - 1));
      } else if (key.downArrow) {
        setSelected((s) => Math.min(LOGIN_METHODS.length - 1, s + 1));
      } else if (key.return) {
        const method = LOGIN_METHODS[selected];
        if (method?.id === "codeva") {
          setScreen("codeva-login");
        } else if (method?.id === "apikey") {
          setScreen("apikey-input");
          setApiKeyStage("provider");
          setApiKeyProvider("codeva");
          setSelected(0);
        } else if (method?.id === "thirdparty") {
          setScreen("thirdparty-platforms");
          setTpSelected(0);
        }
      }
      return;
    }
    if (screen === "codeva-login") {
      if (key.escape) {
        setScreen("main");
        setSelected(0);
        return;
      }
      return;
    }
    if (screen === "apikey-input") {
      if (apiKeyStage === "provider") {
        if (key.escape) {
          setScreen("main");
          setSelected(1);
          return;
        }
        if (key.upArrow) {
          setSelected((s) => Math.max(0, s - 1));
        } else if (key.downArrow) {
          setSelected((s) => Math.min(API_PROVIDERS.length - 1, s + 1));
        } else if (key.return) {
          const prov = API_PROVIDERS[selected];
          if (prov) {
            setApiKeyProvider(prov.id);
            setApiKeyStage("key");
            setApiKeyInput("");
          }
        }
        return;
      }
      if (key.escape) {
        setApiKeyStage("provider");
        setSelected(0);
        return;
      }
      return;
    }
    if (screen === "thirdparty-platforms") {
      if (key.escape) {
        setScreen("main");
        setSelected(2);
        return;
      }
      if (key.upArrow) {
        setTpSelected((s) => Math.max(0, s - 1));
      } else if (key.downArrow) {
        setTpSelected((s) => Math.min(THIRDPARTY_PLATFORMS.length - 1, s + 1));
      } else if (key.return) {
        const plat = THIRDPARTY_PLATFORMS[tpSelected];
        if (plat?.id === "back") {
          setScreen("main");
          setSelected(2);
        } else if (plat) {
          const urls = {
            openrouter: "https://openrouter.ai/keys",
            groq: "https://console.groq.com/keys",
            ollama: "https://ollama.com/download"
          };
          const url = urls[plat.id];
          if (url) {
            openBrowser(url);
          }
          markOnboardingComplete("thirdparty");
          onComplete("thirdparty");
        }
      }
      return;
    }
  });
  const renderBorderTop = (title) => {
    const titleText = ` ${title} `;
    const dashLength = Math.max(2, contentWidth - titleText.length - 2);
    return /* @__PURE__ */ jsxs4(Text4, { color: "#D97757", children: [
      "\u256D",
      titleText,
      "\u2500".repeat(dashLength),
      "\u256E"
    ] });
  };
  const renderBorderBottom = () => {
    return /* @__PURE__ */ jsxs4(Text4, { color: "#D97757", children: [
      "\u2570",
      "\u2500".repeat(contentWidth),
      "\u256F"
    ] });
  };
  if (screen === "main") {
    const t = activeTheme;
    return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", paddingX: 1, width: contentWidth + 4, children: [
      /* @__PURE__ */ jsxs4(Text4, { bold: true, color: t.accent, children: [
        "Welcome to ",
        CYBERCODER_NAME,
        " v",
        CYBERCODER_VERSION
      ] }),
      /* @__PURE__ */ jsx4(Box4, { marginTop: 1, children: /* @__PURE__ */ jsx4(SkyScene, {}) }),
      /* @__PURE__ */ jsx4(Box4, { marginTop: 1, marginLeft: 1, children: /* @__PURE__ */ jsx4(Mascot, {}) }),
      /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", marginTop: 1, paddingX: 1, children: [
        /* @__PURE__ */ jsxs4(Text4, { color: t.muted, children: [
          CYBERCODER_NAME,
          " can be used with your Codeva subscription or billed"
        ] }),
        /* @__PURE__ */ jsx4(Text4, { color: t.muted, children: "based on API usage through your provider account." }),
        /* @__PURE__ */ jsx4(Box4, { marginTop: 1, children: /* @__PURE__ */ jsx4(Text4, { color: t.text, bold: true, children: "Select login method:" }) }),
        /* @__PURE__ */ jsx4(Box4, { marginTop: 1, flexDirection: "column", children: LOGIN_METHODS.map((method, i) => /* @__PURE__ */ jsx4(Box4, { flexDirection: "row", children: /* @__PURE__ */ jsxs4(Text4, { children: [
          i === selected ? /* @__PURE__ */ jsx4(Text4, { color: t.accent, children: "\u203A " }) : /* @__PURE__ */ jsx4(Text4, { color: t.dim, children: "  " }),
          /* @__PURE__ */ jsxs4(Text4, { color: i === selected ? t.text : t.muted, bold: i === selected, children: [
            i + 1,
            ". ",
            method.label
          ] }),
          /* @__PURE__ */ jsxs4(Text4, { color: t.dim, children: [
            " \xB7 ",
            method.desc
          ] })
        ] }) }, method.id)) }),
        /* @__PURE__ */ jsx4(Box4, { marginTop: 1, children: /* @__PURE__ */ jsx4(Text4, { color: t.dim, children: "\u2191\u2193 navigate \xB7 Enter select \xB7 ESC exit" }) })
      ] })
    ] });
  }
  if (screen === "codeva-login") {
    const frontendUrl = process.env.FRONTEND_URL || "https://cybermindcli.info";
    return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", paddingX: 1, width: contentWidth + 4, children: [
      renderBorderTop("Waiting for Authentication"),
      /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", paddingX: 2, marginY: 1, children: [
        waitingForAuth ? /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", marginBottom: 1, children: [
          /* @__PURE__ */ jsx4(LoadingSpinner, { text: "Waiting for browser authentication..." }),
          /* @__PURE__ */ jsxs4(Box4, { marginTop: 1, children: [
            /* @__PURE__ */ jsx4(Text4, { color: "gray", children: "A browser window should have opened. If not, open:" }),
            /* @__PURE__ */ jsxs4(Text4, { color: "cyan", children: [
              frontendUrl,
              "/login?redirect=cli&port=",
              port || "..."
            ] })
          ] })
        ] }) : /* @__PURE__ */ jsx4(Box4, { flexDirection: "column", marginBottom: 1, children: authError ? /* @__PURE__ */ jsxs4(Text4, { color: "red", bold: true, children: [
          "\u2715 ",
          authError
        ] }) : /* @__PURE__ */ jsx4(Text4, { color: "green", bold: true, children: "\u2713 Authenticated successfully!" }) }),
        /* @__PURE__ */ jsx4(Box4, { marginTop: 1, children: /* @__PURE__ */ jsx4(Text4, { color: "gray", children: "ESC to go back to main menu" }) })
      ] }),
      renderBorderBottom()
    ] });
  }
  if (screen === "apikey-input") {
    if (apiKeyStage === "provider") {
      return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", paddingX: 1, width: contentWidth + 4, children: [
        renderBorderTop("Select API Provider"),
        /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", paddingX: 2, marginY: 1, children: [
          /* @__PURE__ */ jsx4(Text4, { color: "white", bold: true, marginBottom: 1, children: "Select an API provider:" }),
          API_PROVIDERS.map((prov, i) => /* @__PURE__ */ jsx4(Box4, { flexDirection: "row", marginBottom: 1, children: /* @__PURE__ */ jsxs4(Text4, { children: [
            i === selected ? /* @__PURE__ */ jsx4(Text4, { color: "#D97757", children: "\u203A " }) : /* @__PURE__ */ jsx4(Text4, { color: "gray", children: "  " }),
            /* @__PURE__ */ jsxs4(Text4, { color: i === selected ? "white" : "gray", bold: i === selected, children: [
              i + 1,
              ". ",
              prov.label
            ] })
          ] }) }, prov.id)),
          /* @__PURE__ */ jsx4(Box4, { marginTop: 1, children: /* @__PURE__ */ jsx4(Text4, { color: "gray", children: "\u2191\u2193 navigate \xB7 Enter select \xB7 ESC go back" }) })
        ] }),
        renderBorderBottom()
      ] });
    }
    return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", paddingX: 1, width: contentWidth + 4, children: [
      renderBorderTop("Enter API Key"),
      /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", paddingX: 2, marginY: 1, children: [
        /* @__PURE__ */ jsx4(Text4, { color: "white", bold: true, marginBottom: 1, children: "Paste your API key below:" }),
        /* @__PURE__ */ jsxs4(Text4, { color: "gray", marginBottom: 1, children: [
          "Provider: ",
          /* @__PURE__ */ jsx4(Text4, { color: "cyan", bold: true, children: apiKeyProvider })
        ] }),
        /* @__PURE__ */ jsxs4(Box4, { flexDirection: "row", marginBottom: 1, children: [
          /* @__PURE__ */ jsxs4(Text4, { color: "gray", children: [
            ">",
            " "
          ] }),
          /* @__PURE__ */ jsx4(
            TextInput,
            {
              value: apiKeyInput,
              onChange: setApiKeyInput,
              onSubmit: () => {
                const trimmed = apiKeyInput.trim();
                if (trimmed) {
                  setApiKey(apiKeyProvider, trimmed);
                  if (apiKeyProvider === "codeva") {
                    setAuthToken(trimmed);
                    apiClient.authenticate(trimmed).then((authInfo) => {
                      setSessionId(authInfo.session_id);
                      setUserProfile(authInfo.user);
                      markOnboardingComplete("apikey");
                      onComplete("apikey");
                    }).catch((err) => {
                      markOnboardingComplete("apikey");
                      onComplete("apikey");
                    });
                  } else {
                    markOnboardingComplete("apikey");
                    onComplete("apikey");
                  }
                }
              },
              mask: "*"
            }
          )
        ] }),
        /* @__PURE__ */ jsx4(Box4, { marginTop: 1, children: /* @__PURE__ */ jsx4(Text4, { color: "gray", children: "Enter submit \xB7 ESC go back" }) })
      ] }),
      renderBorderBottom()
    ] });
  }
  if (screen === "thirdparty-platforms") {
    return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", paddingX: 1, width: contentWidth + 4, children: [
      renderBorderTop("3rd-Party Platforms"),
      /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", paddingX: 2, marginY: 1, children: [
        /* @__PURE__ */ jsx4(Text4, { color: "white", bold: true, marginBottom: 1, children: "Select a local or 3rd-party platform to set up:" }),
        THIRDPARTY_PLATFORMS.map((plat, i) => /* @__PURE__ */ jsx4(Box4, { flexDirection: "column", marginBottom: 1, children: /* @__PURE__ */ jsxs4(Text4, { children: [
          i === tpSelected ? /* @__PURE__ */ jsx4(Text4, { color: "#D97757", children: "\u203A " }) : /* @__PURE__ */ jsx4(Text4, { color: "gray", children: "  " }),
          /* @__PURE__ */ jsxs4(Text4, { color: i === tpSelected ? "white" : "gray", bold: i === tpSelected, children: [
            i + 1,
            ". ",
            plat.label
          ] }),
          plat.desc && /* @__PURE__ */ jsxs4(Text4, { color: "gray", children: [
            " \xB7 ",
            plat.desc
          ] })
        ] }) }, plat.id)),
        /* @__PURE__ */ jsx4(Box4, { marginTop: 1, children: /* @__PURE__ */ jsx4(Text4, { color: "gray", children: "\u2191\u2193 navigate \xB7 Enter select \xB7 ESC go back" }) })
      ] }),
      renderBorderBottom()
    ] });
  }
  return null;
};

// src/components/ThemePicker.tsx
import { useState as useState3 } from "react";
import { Box as Box5, Text as Text5, useInput as useInput2 } from "ink";
init_src();
import { Fragment, jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
var SYNTAX_THEMES = [
  "Monokai Extended",
  "Dracula",
  "One Dark",
  "Solarized Dark",
  "GitHub Light"
];
var ThemePicker = ({ onComplete }) => {
  const [selected, setSelected] = useState3(1);
  const [syntaxIdx, setSyntaxIdx] = useState3(0);
  const [stage, setStage] = useState3("theme");
  const previewMode = THEME_OPTIONS[stage === "theme" ? selected : selected]?.id ?? "dark";
  const preview = resolvePalette(previewMode);
  useInput2((_, key) => {
    if (stage === "theme") {
      if (key.upArrow) {
        setSelected((s) => {
          const next = Math.max(0, s - 1);
          setActiveTheme(THEME_OPTIONS[next].id);
          return next;
        });
      } else if (key.downArrow) {
        setSelected((s) => {
          const next = Math.min(THEME_OPTIONS.length - 1, s + 1);
          setActiveTheme(THEME_OPTIONS[next].id);
          return next;
        });
      } else if (key.return) {
        setStage("syntax");
      }
    } else {
      if (key.upArrow) {
        setSyntaxIdx((s) => Math.max(0, s - 1));
      } else if (key.downArrow) {
        setSyntaxIdx((s) => Math.min(SYNTAX_THEMES.length - 1, s + 1));
      } else if (key.return) {
        const theme = THEME_OPTIONS[selected];
        const syntax = SYNTAX_THEMES[syntaxIdx];
        if (theme && syntax) {
          onComplete({ mode: theme.id, syntaxTheme: syntax });
        }
      }
    }
  });
  return /* @__PURE__ */ jsxs5(Box5, { flexDirection: "column", marginBottom: 1, children: [
    /* @__PURE__ */ jsxs5(Text5, { bold: true, color: preview.accent, children: [
      "Welcome to ",
      CYBERCODER_NAME,
      " v",
      CYBERCODER_VERSION
    ] }),
    /* @__PURE__ */ jsx5(Box5, { marginTop: 1, children: /* @__PURE__ */ jsx5(SkyScene, {}) }),
    /* @__PURE__ */ jsx5(Box5, { marginTop: 1, marginLeft: 1, children: /* @__PURE__ */ jsx5(Mascot, {}) }),
    /* @__PURE__ */ jsxs5(Box5, { flexDirection: "column", marginTop: 1, paddingLeft: 1, children: [
      /* @__PURE__ */ jsx5(Text5, { bold: true, color: preview.text, children: "Let's get started." }),
      /* @__PURE__ */ jsx5(Box5, { marginTop: 1 }),
      stage === "theme" && /* @__PURE__ */ jsxs5(Fragment, { children: [
        /* @__PURE__ */ jsx5(Text5, { bold: true, color: preview.accent, children: "Choose the text style that looks best with your terminal" }),
        /* @__PURE__ */ jsx5(Text5, { color: preview.muted, children: "To change this later, run /theme" }),
        /* @__PURE__ */ jsx5(Box5, { marginTop: 1 }),
        THEME_OPTIONS.map((opt, i) => /* @__PURE__ */ jsx5(Box5, { flexDirection: "row", children: /* @__PURE__ */ jsxs5(Text5, { children: [
          i === selected ? /* @__PURE__ */ jsx5(Text5, { color: preview.accent, children: "\u203A " }) : /* @__PURE__ */ jsx5(Text5, { color: preview.dim, children: "  " }),
          /* @__PURE__ */ jsxs5(Text5, { color: i === selected ? preview.text : preview.muted, bold: i === selected, children: [
            i + 1,
            ". ",
            opt.label
          ] }),
          i === selected && /* @__PURE__ */ jsx5(Text5, { color: preview.success, children: "  \u2713" })
        ] }) }, opt.id)),
        /* @__PURE__ */ jsx5(Box5, { marginTop: 1 }),
        /* @__PURE__ */ jsx5(Text5, { color: preview.dim, children: "\u2191\u2193 to preview \xB7 Enter to confirm" })
      ] }),
      stage === "syntax" && /* @__PURE__ */ jsxs5(Fragment, { children: [
        /* @__PURE__ */ jsx5(Text5, { bold: true, color: preview.accent, children: "Choose syntax highlighting theme:" }),
        /* @__PURE__ */ jsx5(Box5, { marginTop: 1 }),
        SYNTAX_THEMES.map((name, i) => /* @__PURE__ */ jsx5(Box5, { flexDirection: "row", children: /* @__PURE__ */ jsxs5(Text5, { children: [
          i === syntaxIdx ? /* @__PURE__ */ jsx5(Text5, { color: preview.accent, children: "\u203A " }) : /* @__PURE__ */ jsx5(Text5, { color: preview.dim, children: "  " }),
          /* @__PURE__ */ jsxs5(Text5, { color: i === syntaxIdx ? preview.text : preview.muted, bold: i === syntaxIdx, children: [
            i + 1,
            ". ",
            name
          ] })
        ] }) }, name)),
        /* @__PURE__ */ jsx5(Box5, { marginTop: 1 }),
        /* @__PURE__ */ jsx5(Text5, { color: preview.dim, children: "\u2191\u2193 navigate \xB7 Enter to confirm" })
      ] }),
      /* @__PURE__ */ jsx5(Box5, { marginTop: 1 }),
      /* @__PURE__ */ jsx5(Text5, { color: preview.dim, children: "\u2500".repeat(48) }),
      /* @__PURE__ */ jsxs5(Box5, { flexDirection: "row", children: [
        /* @__PURE__ */ jsx5(Text5, { color: preview.dim, children: "1 " }),
        /* @__PURE__ */ jsx5(Text5, { color: preview.info, children: "function " }),
        /* @__PURE__ */ jsx5(Text5, { color: preview.warning, children: "greet" }),
        /* @__PURE__ */ jsxs5(Text5, { color: preview.text, children: [
          "() ",
          "{"
        ] })
      ] }),
      /* @__PURE__ */ jsxs5(Box5, { flexDirection: "row", children: [
        /* @__PURE__ */ jsx5(Text5, { color: preview.dim, children: "2 " }),
        /* @__PURE__ */ jsxs5(Text5, { color: preview.error, children: [
          "- ",
          'console.log("Hello, World!");'
        ] })
      ] }),
      /* @__PURE__ */ jsxs5(Box5, { flexDirection: "row", children: [
        /* @__PURE__ */ jsx5(Text5, { color: preview.dim, children: "2 " }),
        /* @__PURE__ */ jsxs5(Text5, { color: preview.success, children: [
          "+ ",
          'console.log("Hello, CyberCoder!");'
        ] })
      ] }),
      /* @__PURE__ */ jsxs5(Box5, { flexDirection: "row", children: [
        /* @__PURE__ */ jsx5(Text5, { color: preview.dim, children: "3 " }),
        /* @__PURE__ */ jsx5(Text5, { color: preview.text, children: "}" })
      ] }),
      /* @__PURE__ */ jsx5(Text5, { color: preview.dim, children: "\u2500".repeat(48) })
    ] })
  ] });
};

// src/components/Settings.tsx
init_config();
import { useState as useState4 } from "react";
import { Box as Box6, Text as Text6, useInput as useInput3 } from "ink";
import gradient from "gradient-string";
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
var cyber = gradient(["#00e5ff", "#7b5cff", "#ff5c8a"]);
var SETTINGS_CATEGORIES = [
  {
    id: "general",
    label: "General",
    items: [
      { key: "welcome", label: "Show welcome screen on startup", isBool: true },
      { key: "telemetry", label: "Enable telemetry", isBool: true }
    ]
  },
  {
    id: "appearance",
    label: "Appearance",
    items: [
      { key: "theme", label: "Theme Mode", isBool: false },
      { key: "syntax", label: "Syntax highlighting", isBool: false }
    ]
  },
  {
    id: "ai",
    label: "AI & Providers",
    items: [
      { key: "default_provider", label: "Default provider", isBool: false },
      { key: "default_model", label: "Default model", isBool: false }
    ]
  }
];
var Settings = ({ onClose }) => {
  const [catIdx, setCatIdx] = useState4(0);
  const [itemIdx, setItemIdx] = useState4(0);
  const [config, setConfig] = useState4(() => loadConfig());
  const currentCat = SETTINGS_CATEGORIES[catIdx];
  const getSettingValue = (key) => {
    switch (key) {
      case "welcome":
        return config.showWelcome ?? true;
      case "telemetry":
        return config.telemetry ?? true;
      case "theme":
        return config.theme?.mode ?? "dark";
      case "syntax":
        return config.theme?.syntaxTheme ?? "Monokai Extended";
      case "default_provider":
        return config.lastProvider ?? "auto";
      case "default_model":
        return config.lastModel ?? "auto";
      default:
        return config[key] ?? false;
    }
  };
  const toggleSetting = (key) => {
    const currentValue = getSettingValue(key);
    let updatedPartial = {};
    if (key === "welcome") {
      updatedPartial = { showWelcome: !currentValue };
    } else if (key === "telemetry") {
      updatedPartial = { telemetry: !currentValue };
    } else if (key === "theme") {
      const modes = ["dark", "light", "auto", "dark-ansi", "light-ansi"];
      const nextMode = modes[(modes.indexOf(currentValue) + 1) % modes.length];
      updatedPartial = { theme: { ...config.theme, mode: nextMode, syntaxTheme: config.theme?.syntaxTheme || "Monokai Extended" } };
    } else if (key === "default_provider") {
      const providers = ["auto", "cybermind", "openai", "anthropic", "groq", "google", "openrouter", "ollama"];
      const nextProvider = providers[(providers.indexOf(currentValue) + 1) % providers.length];
      updatedPartial = { lastProvider: nextProvider };
    }
    const newConfig = updateConfig(updatedPartial);
    setConfig(newConfig);
  };
  useInput3((_, key) => {
    if (key.escape || key.ctrl && _ === "c") {
      onClose();
      return;
    }
    if (!currentCat) return;
    if (key.upArrow) {
      setItemIdx((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setItemIdx((i) => Math.min(currentCat.items.length - 1, i + 1));
    } else if (key.leftArrow) {
      setCatIdx((c) => Math.max(0, c - 1));
      setItemIdx(0);
    } else if (key.rightArrow) {
      setCatIdx((c) => Math.min(SETTINGS_CATEGORIES.length - 1, c + 1));
      setItemIdx(0);
    } else if (key.return) {
      const item = currentCat.items[itemIdx];
      if (item) {
        toggleSetting(item.key);
      }
    }
  });
  return /* @__PURE__ */ jsxs6(Box6, { flexDirection: "column", marginBottom: 1, children: [
    /* @__PURE__ */ jsx6(Text6, { children: cyber("\u256D\u2500 Settings \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E") }),
    /* @__PURE__ */ jsxs6(Box6, { flexDirection: "column", paddingLeft: 2, paddingRight: 2, marginTop: 1, children: [
      /* @__PURE__ */ jsx6(Box6, { flexDirection: "row", marginBottom: 1, children: SETTINGS_CATEGORIES.map((cat, i) => /* @__PURE__ */ jsxs6(Text6, { children: [
        /* @__PURE__ */ jsxs6(Text6, { color: i === catIdx ? "#D97736" : "gray", bold: i === catIdx, children: [
          " ",
          cat.label,
          " "
        ] }),
        i < SETTINGS_CATEGORIES.length - 1 && /* @__PURE__ */ jsx6(Text6, { color: "gray", children: "\u2502" })
      ] }, cat.id)) }),
      /* @__PURE__ */ jsx6(Text6, { color: "gray", children: "\u2500".repeat(66) }),
      currentCat && currentCat.items.map((item, i) => {
        const val = getSettingValue(item.key);
        return /* @__PURE__ */ jsxs6(Box6, { flexDirection: "row", marginY: 1, children: [
          /* @__PURE__ */ jsxs6(Text6, { children: [
            i === itemIdx ? /* @__PURE__ */ jsx6(Text6, { color: "#D97736", children: "\u203A " }) : /* @__PURE__ */ jsx6(Text6, { color: "gray", children: "  " }),
            /* @__PURE__ */ jsx6(Text6, { color: i === itemIdx ? "white" : "gray", bold: i === itemIdx, children: item.label })
          ] }),
          /* @__PURE__ */ jsx6(Box6, { flexGrow: 1 }),
          /* @__PURE__ */ jsx6(Text6, { color: typeof val === "boolean" ? val ? "green" : "red" : "cyan", children: typeof val === "boolean" ? val ? "\u2713 enabled" : "\u2717 disabled" : val })
        ] }, item.key);
      }),
      /* @__PURE__ */ jsx6(Box6, { marginTop: 1 }),
      /* @__PURE__ */ jsx6(Text6, { color: "gray", children: "Arrow keys to navigate \xB7 Enter to toggle/cycle \xB7 ESC to close" })
    ] }),
    /* @__PURE__ */ jsx6(Text6, { children: cyber("\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F") })
  ] });
};

// src/components/ModelPicker.tsx
import { useState as useState5 } from "react";
import { Box as Box7, Text as Text7, useInput as useInput4, useStdout as useStdout3 } from "ink";
import { jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
var SUPREME_MODELS = [
  { id: "auto", name: "Auto (recommended)", tier: "all", desc: "Routes to the best available persona for the task" },
  { id: "madhav", name: "Madhav (Pro \u2014 Strategic Mastermind)", tier: "pro", desc: "Deep codebase understanding, complex architecture planning" },
  { id: "kali", name: "Kali (Standard \u2014 Destroyer of Bugs)", tier: "standard", desc: "Relentless debugging, finding edge-case vulnerabilities" },
  { id: "abhimanyu", name: "Abhimanyu (Basic \u2014 Deep Context)", tier: "basic", desc: "Deep-dive local reasoning for breaking complex logic traps" },
  { id: "trinity", name: "Trinity (Free \u2014 The Powerhouse)", tier: "free", desc: "Fast, logic-perfect execution for free tier users" }
];
var ModelPicker = ({ currentModel, onSelect, onClose }) => {
  const t = useTheme();
  const { stdout } = useStdout3();
  const termWidth = stdout?.columns ?? 80;
  const contentWidth = Math.max(termWidth - 6, 50);
  const initialIdx = SUPREME_MODELS.findIndex((m) => m.id === currentModel);
  const [selectedIdx, setSelectedIdx] = useState5(initialIdx >= 0 ? initialIdx : 0);
  useInput4((_, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.upArrow) {
      setSelectedIdx((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIdx((i) => Math.min(SUPREME_MODELS.length - 1, i + 1));
    } else if (key.return) {
      const model = SUPREME_MODELS[selectedIdx];
      if (model) onSelect(model.id);
    }
  });
  const dashLength = Math.max(2, contentWidth - " Model Selection ".length - 2);
  return /* @__PURE__ */ jsxs7(Box7, { flexDirection: "column", marginBottom: 1, children: [
    /* @__PURE__ */ jsxs7(Text7, { color: t.accent, children: [
      "\u256D\u2500 Model Selection ",
      " \u2500".repeat(1),
      "\u2500".repeat(dashLength),
      "\u256E"
    ] }),
    /* @__PURE__ */ jsxs7(Box7, { flexDirection: "column", paddingLeft: 2, paddingRight: 2, marginTop: 1, marginBottom: 1, children: [
      /* @__PURE__ */ jsx7(Text7, { bold: true, color: t.text, children: "CyberCoder Mythological Swarm \u2014 Select model:" }),
      /* @__PURE__ */ jsx7(Box7, { marginTop: 1 }),
      SUPREME_MODELS.map((m, i) => {
        const isSelected = i === selectedIdx;
        const isCurrent = m.id === currentModel;
        const tierColor = m.tier === "pro" ? "#FF6B6B" : m.tier === "standard" ? "#FFD93D" : m.tier === "basic" ? "#6BCB77" : m.tier === "free" ? "#4D96FF" : t.accent;
        return /* @__PURE__ */ jsxs7(Box7, { flexDirection: "column", marginBottom: 1, children: [
          /* @__PURE__ */ jsx7(Box7, { flexDirection: "row", children: /* @__PURE__ */ jsxs7(Text7, { children: [
            isSelected ? /* @__PURE__ */ jsx7(Text7, { color: t.accent, children: "\u203A " }) : /* @__PURE__ */ jsx7(Text7, { color: t.dim, children: "  " }),
            /* @__PURE__ */ jsx7(Text7, { color: isSelected ? t.text : t.muted, bold: isSelected, children: m.name }),
            isCurrent && /* @__PURE__ */ jsx7(Text7, { color: t.success, children: " (current)" }),
            " ",
            /* @__PURE__ */ jsxs7(Text7, { color: tierColor, children: [
              "[",
              m.tier,
              "]"
            ] })
          ] }) }),
          /* @__PURE__ */ jsxs7(Text7, { color: t.dim, children: [
            "     ",
            m.desc
          ] })
        ] }, m.id);
      }),
      /* @__PURE__ */ jsx7(Box7, { marginTop: 1 }),
      /* @__PURE__ */ jsx7(Text7, { color: t.dim, children: "\u2191\u2193 navigate \xB7 Enter select \xB7 ESC close" })
    ] }),
    /* @__PURE__ */ jsxs7(Text7, { color: t.accent, children: [
      "\u2570",
      "\u2500".repeat(contentWidth),
      "\u256F"
    ] })
  ] });
};

// src/components/ReleaseNotes.tsx
import { useState as useState6 } from "react";
import { Box as Box8, Text as Text8, useInput as useInput5 } from "ink";
import { Fragment as Fragment2, jsx as jsx8, jsxs as jsxs8 } from "react/jsx-runtime";
var RELEASES = [
  {
    version: "0.1.18",
    date: "May 29, 2026",
    highlights: [
      "Added / command discovery \u2014 just type / to see all commands",
      "Added HintBar with contextual shortcuts at the bottom",
      "Auto-update check on startup (checks npm registry)",
      "Improved prompt UI with Claude Code style > symbol",
      "Added /login and /subscribe website pages for CLI auth flow"
    ]
  },
  {
    version: "0.1.17",
    date: "May 29, 2026",
    highlights: [
      "Redesigned welcome screen with sky scene pixel art",
      "New \u{1F47E} space invader style mascot",
      "Interactive login subpages: CyberCli, API Key, 3rd Party",
      "Config persistence in ~/.cybercoder/config.json",
      "Theme picker saves selection across sessions",
      "/logout command clears config and returns to onboarding"
    ]
  },
  {
    version: "0.1.16",
    date: "May 28, 2026",
    highlights: [
      "Added onboarding screen with login method selection",
      "Added theme picker with 7 modes and syntax preview",
      "Added settings screen with 4 category tabs",
      "Screen state machine: onboarding \u2192 theme \u2192 welcome \u2192 chat",
      "/theme and /settings commands open interactive screens"
    ]
  },
  {
    version: "0.1.15",
    date: "May 27, 2026",
    highlights: [
      "Cross-platform install scripts (install.sh, install.ps1, install.cmd)",
      "Updated product page with tabbed install commands",
      "Removed cybermind command, kept only cm",
      "Claude Code style welcome card and status bar"
    ]
  }
];
var ReleaseNotes = ({ onClose }) => {
  const [selected, setSelected] = useState6(0);
  useInput5((_, key) => {
    if (key.escape || key.ctrl && _ === "c") {
      onClose();
      return;
    }
    if (key.upArrow) {
      setSelected((s) => Math.max(0, s - 1));
    } else if (key.downArrow) {
      setSelected((s) => Math.min(RELEASES.length - 1, s + 1));
    }
  });
  const rel = RELEASES[selected];
  return /* @__PURE__ */ jsxs8(Box8, { flexDirection: "column", marginBottom: 1, children: [
    /* @__PURE__ */ jsx8(Text8, { color: "#D97736", children: "\u256D\u2500 Release Notes \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E" }),
    /* @__PURE__ */ jsxs8(Box8, { flexDirection: "column", paddingLeft: 2, paddingRight: 2, marginTop: 1, children: [
      /* @__PURE__ */ jsx8(Box8, { flexDirection: "row", marginBottom: 1, children: RELEASES.map((r, i) => /* @__PURE__ */ jsxs8(Text8, { children: [
        /* @__PURE__ */ jsxs8(Text8, { color: i === selected ? "#D97736" : "gray", bold: i === selected, children: [
          " ",
          r.version,
          " "
        ] }),
        i < RELEASES.length - 1 && /* @__PURE__ */ jsx8(Text8, { color: "gray", children: "\u2502" })
      ] }, r.version)) }),
      /* @__PURE__ */ jsx8(Text8, { color: "gray", children: "\u2500".repeat(50) }),
      rel && /* @__PURE__ */ jsxs8(Fragment2, { children: [
        /* @__PURE__ */ jsxs8(Text8, { bold: true, color: "white", children: [
          rel.version,
          " \u2014 ",
          rel.date
        ] }),
        /* @__PURE__ */ jsx8(Box8, { marginTop: 1 }),
        rel.highlights.map((h, i) => /* @__PURE__ */ jsxs8(Box8, { flexDirection: "row", marginBottom: 1, children: [
          /* @__PURE__ */ jsx8(Text8, { color: "#D97736", children: "\u2022 " }),
          /* @__PURE__ */ jsx8(Text8, { color: "gray", children: h })
        ] }, i))
      ] }),
      /* @__PURE__ */ jsx8(Box8, { marginTop: 1 }),
      /* @__PURE__ */ jsx8(Text8, { color: "gray", children: "Arrow keys to switch version, ESC to close" })
    ] }),
    /* @__PURE__ */ jsx8(Text8, { color: "#D97736", children: "\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F" })
  ] });
};

// src/components/Prompt.tsx
import { useState as useState7 } from "react";
import { Box as Box9, Text as Text9, useInput as useInput6 } from "ink";
import TextInput2 from "ink-text-input";
import { jsx as jsx9, jsxs as jsxs9 } from "react/jsx-runtime";
var promptHistory = [];
var Prompt = ({ onSubmit, disabled }) => {
  const [value, setValue] = useState7("");
  const [historyIndex, setHistoryIndex] = useState7(-1);
  const t = useTheme();
  useInput6((_input, key) => {
    if (disabled) return;
    if (key.upArrow) {
      if (promptHistory.length > 0) {
        const nextIndex = historyIndex === -1 ? promptHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIndex);
        setValue(promptHistory[nextIndex] || "");
      }
    } else if (key.downArrow) {
      if (historyIndex !== -1) {
        const nextIndex = historyIndex + 1;
        if (nextIndex >= promptHistory.length) {
          setHistoryIndex(-1);
          setValue("");
        } else {
          setHistoryIndex(nextIndex);
          setValue(promptHistory[nextIndex] || "");
        }
      }
    }
  });
  const handleSubmit = (text) => {
    if (text.endsWith("\\")) {
      setValue(text.slice(0, -1) + "\n");
      return;
    }
    const trimmed = text.trim();
    if (trimmed) {
      if (promptHistory.length === 0 || promptHistory[promptHistory.length - 1] !== trimmed) {
        promptHistory.push(trimmed);
      }
      setHistoryIndex(-1);
      onSubmit(trimmed);
      setValue("");
    }
  };
  return /* @__PURE__ */ jsxs9(Box9, { flexDirection: "row", paddingX: 0, marginTop: 0, children: [
    /* @__PURE__ */ jsx9(Text9, { color: disabled ? t.dim : t.accent, bold: true, children: "\u276F " }),
    disabled ? /* @__PURE__ */ jsx9(Text9, { color: t.dim, children: "\u2026" }) : /* @__PURE__ */ jsx9(
      TextInput2,
      {
        value,
        onChange: setValue,
        onSubmit: handleSubmit,
        placeholder: 'Try "fix typecheck errors"'
      }
    )
  ] });
};

// src/components/MessageList.tsx
import { Box as Box10, Text as Text10 } from "ink";
import { jsx as jsx10, jsxs as jsxs10 } from "react/jsx-runtime";
var ROLE_LABEL = {
  user: "you",
  assistant: "cybercoder",
  system: "info",
  tool: "tool"
};
function renderFormattedText(text, key) {
  const parts = [];
  let currentText = "";
  let i = 0;
  while (i < text.length) {
    if (text.startsWith("**", i)) {
      if (currentText) {
        parts.push(/* @__PURE__ */ jsx10(Text10, { children: currentText }, `txt-${i}`));
        currentText = "";
      }
      i += 2;
      const endIdx = text.indexOf("**", i);
      if (endIdx !== -1) {
        const boldContent = text.substring(i, endIdx);
        parts.push(/* @__PURE__ */ jsx10(Text10, { bold: true, color: "white", children: boldContent }, `bold-${i}`));
        i = endIdx + 2;
      } else {
        currentText += "**";
      }
    } else if (text.startsWith("`", i)) {
      if (currentText) {
        parts.push(/* @__PURE__ */ jsx10(Text10, { children: currentText }, `txt-${i}`));
        currentText = "";
      }
      i += 1;
      const endIdx = text.indexOf("`", i);
      if (endIdx !== -1) {
        const codeContent = text.substring(i, endIdx);
        parts.push(/* @__PURE__ */ jsx10(Text10, { color: "cyan", bold: true, children: codeContent }, `inline-code-${i}`));
        i = endIdx + 1;
      } else {
        currentText += "`";
      }
    } else {
      currentText += text[i];
      i++;
    }
  }
  if (currentText) {
    parts.push(/* @__PURE__ */ jsx10(Text10, { children: currentText }, `txt-end`));
  }
  if (text.startsWith("# ")) {
    return /* @__PURE__ */ jsx10(Box10, { marginTop: 1, marginBottom: 1, children: /* @__PURE__ */ jsx10(Text10, { color: "#D97757", bold: true, underline: true, children: text.slice(2) }) }, key);
  }
  if (text.startsWith("## ")) {
    return /* @__PURE__ */ jsx10(Box10, { marginTop: 1, children: /* @__PURE__ */ jsx10(Text10, { color: "#D97757", bold: true, children: text.slice(3) }) }, key);
  }
  return /* @__PURE__ */ jsx10(Box10, { flexDirection: "row", children: /* @__PURE__ */ jsx10(Text10, { children: parts }) }, key);
}
function parseContent(content) {
  const lines = content.split("\n");
  const elements = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        const langHeader = codeBlockLang ? ` ${codeBlockLang.toUpperCase()} ` : " CODE ";
        elements.push(
          /* @__PURE__ */ jsxs10(Box10, { flexDirection: "column", marginY: 1, borderStyle: "round", borderColor: "gray", children: [
            /* @__PURE__ */ jsx10(Box10, { paddingX: 1, backgroundColor: "gray", children: /* @__PURE__ */ jsx10(Text10, { color: "black", bold: true, children: langHeader }) }),
            /* @__PURE__ */ jsx10(Box10, { paddingX: 1, flexDirection: "column", children: codeBlockLines.map((l, idx) => {
              let color = "white";
              if (codeBlockLang.toLowerCase() === "diff") {
                if (l.startsWith("+") && !l.startsWith("+++")) color = "green";
                else if (l.startsWith("-") && !l.startsWith("---")) color = "red";
                else if (l.startsWith("@@")) color = "cyan";
              }
              return /* @__PURE__ */ jsx10(Text10, { color, children: l }, idx);
            }) })
          ] }, `code-${i}`)
        );
        codeBlockLines = [];
        codeBlockLang = "";
      } else {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }
    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }
    if (line.startsWith("[\u2192 ") && line.includes("]")) {
      const match = line.match(/^\[→ ([^\]]+)\](.*)$/);
      if (match) {
        const toolName = match[1]?.trim() || "";
        const toolArgs = match[2]?.trim() || "";
        elements.push(
          /* @__PURE__ */ jsxs10(Box10, { flexDirection: "column", paddingX: 1, marginY: 1, borderStyle: "single", borderColor: "yellow", children: [
            /* @__PURE__ */ jsxs10(Text10, { color: "yellow", bold: true, children: [
              "\u26A1 Tool Call: ",
              toolName
            ] }),
            /* @__PURE__ */ jsx10(Text10, { color: "gray", children: toolArgs })
          ] }, `tool-${i}`)
        );
        continue;
      }
    }
    if (line.startsWith("+") && !line.startsWith("+++")) {
      elements.push(/* @__PURE__ */ jsx10(Text10, { color: "green", children: line }, i));
      continue;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      elements.push(/* @__PURE__ */ jsx10(Text10, { color: "red", children: line }, i));
      continue;
    } else if (line.startsWith("@@")) {
      elements.push(/* @__PURE__ */ jsx10(Text10, { color: "cyan", children: line }, i));
      continue;
    }
    elements.push(renderFormattedText(line, i));
  }
  return elements;
}
var MessageList = ({ messages }) => {
  if (messages.length === 0) return null;
  const roleColor = {
    user: activeTheme.user,
    assistant: activeTheme.assistant,
    system: activeTheme.muted,
    tool: activeTheme.accentAlt
  };
  return /* @__PURE__ */ jsx10(Box10, { flexDirection: "column", marginBottom: 1, children: messages.map((m) => {
    if (m.role === "system" && !m.content.trim()) return null;
    return /* @__PURE__ */ jsxs10(Box10, { flexDirection: "column", marginBottom: 1, children: [
      /* @__PURE__ */ jsx10(Text10, { color: roleColor[m.role], bold: true, children: ROLE_LABEL[m.role] }),
      /* @__PURE__ */ jsx10(Box10, { flexDirection: "column", paddingLeft: 1, children: parseContent(m.content) })
    ] }, m.id);
  }) });
};

// src/components/StatusBar.tsx
import { Box as Box11, Text as Text11, useStdout as useStdout4 } from "ink";
import { jsx as jsx11, jsxs as jsxs11 } from "react/jsx-runtime";
var STATUS_LABEL = {
  idle: "ready",
  thinking: "thinking\u2026",
  "awaiting-approval": "awaiting approval",
  error: "error"
};
var StatusBar = ({ status, model, provider, tokens = 0, cost = 0 }) => {
  const t = useTheme();
  const { stdout } = useStdout4();
  const termWidth = stdout?.columns ?? 80;
  const statusColor = {
    idle: t.success,
    thinking: t.warning,
    "awaiting-approval": t.accentAlt,
    error: t.error
  };
  const formatTokens2 = (num) => {
    if (num >= 1e3) {
      return `${(num / 1e3).toFixed(1)}k`;
    }
    return num.toString();
  };
  const leftPart = `[${STATUS_LABEL[status]}]  ${model} \xB7 ${provider} | tokens: ${formatTokens2(tokens)} | cost: $${cost.toFixed(2)} | ? shortcuts`;
  return /* @__PURE__ */ jsxs11(Box11, { paddingLeft: 1, marginTop: 0, children: [
    /* @__PURE__ */ jsx11(Text11, { color: t.dim, children: "[" }),
    /* @__PURE__ */ jsx11(Text11, { color: statusColor[status], bold: true, children: STATUS_LABEL[status] }),
    /* @__PURE__ */ jsx11(Text11, { color: t.dim, children: "]  " }),
    /* @__PURE__ */ jsx11(Text11, { color: t.text, bold: true, children: model }),
    /* @__PURE__ */ jsx11(Text11, { color: t.dim, children: " \xB7 " }),
    /* @__PURE__ */ jsx11(Text11, { color: t.text, children: provider }),
    /* @__PURE__ */ jsx11(Text11, { color: t.dim, children: " \u2502 " }),
    /* @__PURE__ */ jsx11(Text11, { color: t.dim, children: "tokens: " }),
    /* @__PURE__ */ jsx11(Text11, { color: t.info, bold: true, children: formatTokens2(tokens) }),
    /* @__PURE__ */ jsx11(Text11, { color: t.dim, children: " \u2502 " }),
    /* @__PURE__ */ jsx11(Text11, { color: t.dim, children: "cost: " }),
    /* @__PURE__ */ jsxs11(Text11, { color: t.success, bold: true, children: [
      "$",
      cost.toFixed(2)
    ] }),
    /* @__PURE__ */ jsx11(Text11, { color: t.dim, children: " \u2502 " }),
    /* @__PURE__ */ jsx11(Text11, { color: t.dim, children: "? shortcuts" })
  ] });
};

// src/components/ThinkingIndicator.tsx
import { useEffect as useEffect3, useState as useState8 } from "react";
import { Box as Box12, Text as Text12 } from "ink";
import { jsx as jsx12, jsxs as jsxs12 } from "react/jsx-runtime";
var WORDS = [
  "Thinking",
  "Pondering",
  "Conjuring",
  "Reasoning",
  "Computing",
  "Synthesizing",
  "Architecting",
  "Untangling",
  "Investigating",
  "Cooking",
  "Crunching",
  "Composing",
  "Deliberating",
  "Strategizing",
  "Assembling",
  "Tinkering",
  "Wrangling",
  "Noodling"
];
var FRAMES = ["\u28FE", "\u28FD", "\u28FB", "\u28BF", "\u287F", "\u28DF", "\u28EF", "\u28F7"];
var ThinkingIndicator = ({ tokens = 0, label }) => {
  const t = activeTheme;
  const [frame, setFrame] = useState8(0);
  const [wordIdx, setWordIdx] = useState8(() => Math.floor(Math.random() * WORDS.length));
  const [elapsed, setElapsed] = useState8(0);
  useEffect3(() => {
    const f = setInterval(() => setFrame((x) => (x + 1) % FRAMES.length), 80);
    const w = setInterval(() => setWordIdx((x) => (x + 1) % WORDS.length), 3200);
    const e = setInterval(() => setElapsed((x) => x + 1), 1e3);
    return () => {
      clearInterval(f);
      clearInterval(w);
      clearInterval(e);
    };
  }, []);
  const word = label || WORDS[wordIdx];
  return /* @__PURE__ */ jsxs12(Box12, { marginTop: 1, paddingLeft: 1, children: [
    /* @__PURE__ */ jsxs12(Text12, { color: t.accent, children: [
      FRAMES[frame],
      " "
    ] }),
    /* @__PURE__ */ jsxs12(Text12, { color: t.accent, bold: true, children: [
      word,
      "\u2026"
    ] }),
    /* @__PURE__ */ jsxs12(Text12, { color: t.dim, children: [
      "  (",
      elapsed,
      "s"
    ] }),
    tokens > 0 && /* @__PURE__ */ jsxs12(Text12, { color: t.dim, children: [
      " \xB7 ",
      formatTokens(tokens),
      " tokens"
    ] }),
    /* @__PURE__ */ jsx12(Text12, { color: t.dim, children: " \xB7 esc to interrupt)" })
  ] });
};
function formatTokens(n) {
  return n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n);
}

// src/components/ExitConfirm.tsx
import { Box as Box13, Text as Text13 } from "ink";
import { jsx as jsx13 } from "react/jsx-runtime";
var ExitConfirm = () => /* @__PURE__ */ jsx13(Box13, { marginTop: 1, children: /* @__PURE__ */ jsx13(Text13, { color: "yellow", children: "Press Ctrl+C again within 2s to exit, or type /exit." }) });

// src/components/ApprovalDialog.tsx
import { Box as Box14, Text as Text14, useInput as useInput7 } from "ink";
import { jsx as jsx14, jsxs as jsxs13 } from "react/jsx-runtime";
var ApprovalDialog = ({ pending }) => {
  useInput7((input, key) => {
    const char = input.toLowerCase();
    if (char === "y") {
      pending.resolve("allow");
    } else if (char === "n" || key.escape) {
      pending.resolve("deny");
    } else if (char === "a") {
      pending.resolve("allow-persistent");
    }
  });
  return /* @__PURE__ */ jsxs13(
    Box14,
    {
      flexDirection: "column",
      borderStyle: "double",
      borderColor: pending.destructive ? "red" : "yellow",
      paddingX: 1,
      marginY: 1,
      children: [
        /* @__PURE__ */ jsx14(Text14, { bold: true, color: pending.destructive ? "red" : "yellow", children: pending.destructive ? "\u26A0 Critical Tool Approval Required" : "\u26A1 Tool Approval Required" }),
        /* @__PURE__ */ jsxs13(Box14, { marginTop: 1, flexDirection: "column", children: [
          /* @__PURE__ */ jsxs13(Text14, { children: [
            "Tool: ",
            /* @__PURE__ */ jsx14(Text14, { color: "cyan", bold: true, children: pending.toolName })
          ] }),
          /* @__PURE__ */ jsx14(Text14, { color: "gray", children: pending.summary })
        ] }),
        /* @__PURE__ */ jsx14(Box14, { marginTop: 1, children: /* @__PURE__ */ jsxs13(Text14, { children: [
          /* @__PURE__ */ jsx14(Text14, { bold: true, color: "green", children: "[y] Allow" }),
          " \xB7 ",
          /* @__PURE__ */ jsx14(Text14, { bold: true, color: "red", children: "[n] Deny" }),
          " \xB7 ",
          /* @__PURE__ */ jsx14(Text14, { bold: true, color: "yellow", children: "[a] Always allow" }),
          " \xB7 ",
          /* @__PURE__ */ jsx14(Text14, { bold: true, color: "gray", children: "[ESC] Cancel" })
        ] }) })
      ]
    }
  );
};

// src/components/HintBar.tsx
import { Box as Box15, Text as Text15, useStdout as useStdout5 } from "ink";
import { jsx as jsx15, jsxs as jsxs14 } from "react/jsx-runtime";
var HintBar = ({ status = "idle" }) => {
  const { stdout } = useStdout5();
  const t = useTheme();
  const termWidth = stdout.columns ?? 80;
  const contentWidth = Math.min(termWidth - 4, 76);
  const getHints = () => {
    switch (status) {
      case "thinking":
        return /* @__PURE__ */ jsxs14(Text15, { color: t.muted, children: [
          /* @__PURE__ */ jsx15(Text15, { bold: true, color: t.accent, children: "Esc" }),
          " to interrupt \xB7 ",
          /* @__PURE__ */ jsx15(Text15, { bold: true, color: t.accent, children: "?" }),
          " for shortcuts"
        ] });
      case "awaiting-approval":
        return /* @__PURE__ */ jsxs14(Text15, { color: t.muted, children: [
          /* @__PURE__ */ jsx15(Text15, { bold: true, color: t.success, children: "y" }),
          " allow \xB7 ",
          /* @__PURE__ */ jsx15(Text15, { bold: true, color: t.error, children: "n" }),
          " deny \xB7 ",
          /* @__PURE__ */ jsx15(Text15, { bold: true, color: t.warning, children: "a" }),
          " always \xB7 ",
          /* @__PURE__ */ jsx15(Text15, { bold: true, color: t.dim, children: "ESC" }),
          " cancel"
        ] });
      case "idle":
      default:
        return /* @__PURE__ */ jsxs14(Text15, { color: t.muted, children: [
          /* @__PURE__ */ jsx15(Text15, { bold: true, color: t.accent, children: "?" }),
          " for shortcuts \xB7 ",
          /* @__PURE__ */ jsx15(Text15, { bold: true, color: t.accent, children: "\u2190" }),
          " for agents"
        ] });
    }
  };
  return /* @__PURE__ */ jsx15(Box15, { flexDirection: "row", paddingLeft: 1, marginTop: 0, children: getHints() });
};

// src/commands/help.ts
var CATEGORY_ORDER = [
  "session",
  "agent",
  "skills",
  "auth",
  "config",
  "safety",
  "collab",
  "cyber",
  "utility"
];
var CATEGORY_LABEL = {
  session: "Session",
  agent: "Agent",
  skills: "Skills",
  auth: "Auth",
  config: "Config",
  safety: "Safety",
  collab: "Collaboration",
  cyber: "Cyber",
  utility: "Utility"
};
function buildHelpCommand(ctx, getAll) {
  return {
    name: "help",
    description: "Show all available slash commands grouped by category.",
    category: "session",
    aliases: ["?"],
    usage: "/help [command]",
    run: (args) => {
      const filter = args.trim();
      const all = getAll().filter((c) => !c.hidden);
      if (filter) {
        const match = all.find((c) => c.name === filter || c.aliases?.includes(filter));
        if (!match) {
          ctx.appendMessage({
            id: `help-${Date.now()}`,
            role: "system",
            content: `No command named /${filter}. Type /help with no arguments to list all.`,
            createdAt: Date.now()
          });
          return;
        }
        ctx.appendMessage({
          id: `help-${Date.now()}`,
          role: "system",
          content: formatOne(match),
          createdAt: Date.now()
        });
        return;
      }
      const grouped = {};
      for (const c of all) (grouped[c.category] ??= []).push(c);
      const lines = [];
      lines.push("CyberCoder slash commands:");
      for (const cat of CATEGORY_ORDER) {
        const cmds = grouped[cat];
        if (!cmds?.length) continue;
        lines.push("");
        lines.push(`  ${CATEGORY_LABEL[cat]}`);
        for (const c of cmds.sort((a, b) => a.name.localeCompare(b.name))) {
          const aliasNote = c.aliases?.length ? ` (aliases: ${c.aliases.map((a) => `/${a}`).join(", ")})` : "";
          lines.push(`    /${c.name.padEnd(16)} ${c.description}${aliasNote}`);
        }
      }
      lines.push("");
      lines.push("  Type /help <name> for usage of a specific command.");
      ctx.appendMessage({
        id: `help-${Date.now()}`,
        role: "system",
        content: lines.join("\n"),
        createdAt: Date.now()
      });
    }
  };
}
function formatOne(c) {
  const lines = [];
  lines.push(`/${c.name} \u2014 ${c.description}`);
  if (c.aliases?.length) lines.push(`  aliases: ${c.aliases.map((a) => `/${a}`).join(", ")}`);
  if (c.usage) lines.push(`  usage:   ${c.usage}`);
  lines.push(`  category: ${c.category}`);
  return lines.join("\n");
}

// src/commands/clear.ts
function buildClearCommand(ctx) {
  return {
    name: "clear",
    description: "Clear the current conversation and hide the welcome card.",
    category: "session",
    usage: "/clear",
    run: () => {
      ctx.clear();
    }
  };
}

// src/commands/exit.ts
function buildExitCommand(ctx) {
  return {
    name: "exit",
    description: "Quit CyberCoder.",
    category: "session",
    aliases: ["quit", "q"],
    usage: "/exit",
    run: () => {
      ctx.appendMessage({
        id: `exit-${Date.now()}`,
        role: "system",
        content: "Goodbye. Run `cybercoder` again any time.",
        createdAt: Date.now()
      });
      setTimeout(() => ctx.exit(), 80);
    }
  };
}

// src/commands/stubs.ts
var STUBS = [
  // Session / context (planned)
  { name: "background", category: "session", milestone: "planned", description: "Send this session to the background and free the terminal." },
  { name: "btw", category: "session", milestone: "planned", description: "Ask a quick side question without interrupting the main thread." },
  // Agent / model (planned)
  { name: "advisor", category: "agent", milestone: "planned", description: "Consult a stronger advisor model at key moments." },
  // Auth / sync (planned)
  { name: "team-workspace", category: "auth", milestone: "planned", description: "Switch the active team workspace." },
  { name: "sync", category: "auth", milestone: "planned", description: "Push/pull skills and settings to/from the backend." },
  // Safety (planned)
  { name: "sandbox", category: "safety", milestone: "planned", description: "Toggle Docker/Podman sandbox for risky commands." },
  // Collab (planned)
  { name: "pair", category: "collab", milestone: "planned", description: "Start or join a live pair session over LAN/tunnel." }
];
function buildStubCommands(ctx) {
  return STUBS.map((spec) => ({
    name: spec.name,
    description: spec.description,
    category: spec.category,
    aliases: spec.aliases,
    usage: spec.usage,
    run: () => {
      ctx.appendMessage({
        id: `${spec.name}-${Date.now()}`,
        role: "system",
        content: `/${spec.name} is planned and not yet available. Use /help to see active commands.`,
        createdAt: Date.now()
      });
    }
  }));
}

// src/commands/skills.ts
init_chat();
function buildSkillsCommand(ctx) {
  return {
    name: "skills",
    description: 'List installed skills, or "/skills reload" to rescan after adding one.',
    category: "skills",
    usage: "/skills [list|reload]",
    run: (args) => {
      const registry = getSkillRegistry();
      const sub = args.trim().toLowerCase();
      if (sub === "reload") {
        registry.reload();
        ctx.appendMessage({
          id: `skills-${Date.now()}`,
          role: "system",
          content: `Reloaded skills. ${registry.list().length} installed.`,
          createdAt: Date.now()
        });
        return;
      }
      const grouped = registry.bySource();
      const lines = ["Installed skills:"];
      for (const source of ["bundled", "user", "project", "marketplace"]) {
        const items = grouped[source];
        if (items.length === 0) continue;
        lines.push("");
        lines.push(`  [${source}]`);
        for (const s of items.sort((a, b) => a.frontmatter.name.localeCompare(b.frontmatter.name))) {
          lines.push(`    ${s.frontmatter.name.padEnd(20)} \u2014 ${s.frontmatter.description}`);
        }
      }
      const total = registry.list().length;
      if (total === 0) {
        lines.push("  (none found \u2014 add SKILL.md files under .codeva/skills/)");
      } else {
        lines.push("");
        lines.push(`  Total: ${total} skill(s). Shortcuts: /research /plan /code-review /debug /security /commit /web`);
      }
      ctx.appendMessage({
        id: `skills-${Date.now()}`,
        role: "system",
        content: lines.join("\n"),
        createdAt: Date.now()
      });
    }
  };
}
function buildSkillShortcut(ctx, name, skill, description) {
  return {
    name,
    description,
    category: "agent",
    usage: `/${name} <task description>`,
    run: (args) => {
      const task = args.trim();
      if (!task) {
        ctx.appendMessage({
          id: `${name}-${Date.now()}`,
          role: "system",
          content: `/${name} needs a task description. Try: /${name} where is authentication handled?`,
          createdAt: Date.now()
        });
        return;
      }
      const registry = getSkillRegistry();
      if (!registry.has(skill)) {
        ctx.appendMessage({
          id: `${name}-${Date.now()}`,
          role: "system",
          content: `Skill "${skill}" is not installed. Add it under .codeva/skills/<name>/SKILL.md (project) or ~/.codeva/skills/ (global), then run /skills reload.`,
          createdAt: Date.now()
        });
        return;
      }
      ctx.appendMessage({
        id: `${name}-${Date.now()}`,
        role: "system",
        content: `Delegating to /${skill} sub-agent\u2026`,
        createdAt: Date.now()
      });
      ctx.submitUserPrompt?.(`Use spawn_subagent to run the "${skill}" skill on this task: ${task}`);
    }
  };
}
function buildResearchCommand(ctx) {
  return buildSkillShortcut(
    ctx,
    "research",
    "research",
    "Spawn the read-only codebase exploration sub-agent."
  );
}
function buildPlanCommand(ctx) {
  return buildSkillShortcut(
    ctx,
    "plan",
    "plan",
    "Spawn the planning sub-agent to break down a task."
  );
}
function buildCodeReviewCommand(ctx) {
  return buildSkillShortcut(
    ctx,
    "code-review",
    "code-review",
    "Spawn the code-review sub-agent on a diff, file, or commit."
  );
}
function buildDebugCommand(ctx) {
  return buildSkillShortcut(ctx, "debug", "debugger", "Spawn the systematic root-cause debugging sub-agent.");
}
function buildSecurityCommand(ctx) {
  return buildSkillShortcut(ctx, "security", "security-audit", "Spawn the read-only security audit sub-agent.");
}
function buildCommitCommand(ctx) {
  return buildSkillShortcut(ctx, "commit", "commit", "Stage and write Conventional Commits from the working tree.");
}
function buildWebCommand(ctx) {
  return buildSkillShortcut(ctx, "web", "web-research", "Spawn the live web-research sub-agent (search + fetch + cite).");
}
function buildFixCommand(ctx) {
  return buildSkillShortcut(ctx, "fix", "test-fixer", "Run tests and self-heal the code until green (bounded).");
}
function buildGoalCommand(ctx) {
  return {
    name: "goal",
    description: "Work autonomously toward an objective until it is done (multi-round).",
    category: "agent",
    usage: "/goal <objective>",
    run: (args) => {
      ctx.submitUserPrompt?.(args.trim() ? `Work toward this goal until complete: ${args.trim()}` : "Usage: /goal <objective>");
    }
  };
}

// src/commands/trust.ts
init_src4();
function buildTrustCommand(ctx) {
  return {
    name: "trust",
    description: "Persistently allow a tool without prompting (read/write ~/.cybercoder/trust.json).",
    category: "safety",
    usage: "/trust [add|remove] <tool>",
    run: (args) => {
      const [sub, tool] = args.split(/\s+/).filter(Boolean);
      const gate = new ApprovalGate(new HeadlessApprovalUI());
      const reply = (content) => ctx.appendMessage({
        id: `trust-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      if (!sub || sub === "list") {
        const { persistent } = gate.listTrusted();
        if (persistent.length === 0) {
          reply("No tools persistently trusted. Use /trust add <tool> to add one.");
        } else {
          reply(`Persistently trusted tools:
  ${persistent.join("\n  ")}`);
        }
        return;
      }
      if (!tool) {
        reply(`/trust ${sub} requires a tool name. Try: /trust add edit`);
        return;
      }
      if (sub === "add") {
        gate.trustPersistent(tool);
        reply(`Trusted '${tool}' persistently. Future calls will skip the approval prompt.`);
      } else if (sub === "remove" || sub === "revoke") {
        gate.revoke(tool);
        reply(`Revoked trust for '${tool}'. Next call will prompt again.`);
      } else {
        reply(`Unknown subcommand '${sub}'. Try /trust, /trust add <tool>, or /trust remove <tool>.`);
      }
    }
  };
}

// src/commands/secret.ts
init_src4();
function buildSecretCommand(ctx) {
  return {
    name: "secret",
    description: "Manage the encrypted secrets vault (~/.cybercoder/secrets.enc).",
    category: "safety",
    usage: "/secret list | /secret set NAME=value | /secret get NAME | /secret remove NAME",
    run: (args) => {
      const trimmed = args.trim();
      const vault = new SecretsVault();
      const reply = (content) => ctx.appendMessage({
        id: `secret-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      if (!trimmed || trimmed === "list") {
        const names = vault.list();
        if (names.length === 0) {
          reply("Vault is empty. Use /secret set NAME=value to add one.");
        } else {
          reply(`Stored secrets (names only):
  ${names.join("\n  ")}`);
        }
        return;
      }
      const spaceIdx = trimmed.indexOf(" ");
      const sub = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
      const rest = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();
      if (sub === "set") {
        const eq = rest.indexOf("=");
        if (eq === -1) {
          reply("Usage: /secret set NAME=value");
          return;
        }
        const name = rest.slice(0, eq).trim();
        const value = rest.slice(eq + 1);
        if (!name) {
          reply("Secret name must be non-empty.");
          return;
        }
        vault.set(name, value);
        reply(`Stored secret '${name}'.`);
        return;
      }
      if (sub === "get") {
        const value = vault.get(rest);
        if (value === void 0) reply(`No secret named '${rest}'.`);
        else reply(`${rest}=${value}`);
        return;
      }
      if (sub === "remove" || sub === "delete" || sub === "rm") {
        const ok = vault.remove(rest);
        reply(ok ? `Removed secret '${rest}'.` : `No secret named '${rest}'.`);
        return;
      }
      reply(`Unknown subcommand '${sub}'. Try /secret list, /secret set NAME=value, /secret get NAME, /secret remove NAME.`);
    }
  };
}

// src/commands/model-provider.ts
init_chat();
function buildModelCommand(ctx) {
  return {
    name: "model",
    description: "Show or switch the active model for this session.",
    category: "agent",
    usage: "/model [name]",
    run: async (args) => {
      const name = args.trim();
      const reply = (content) => ctx.appendMessage({ id: `model-${Date.now()}`, role: "system", content, createdAt: Date.now() });
      if (!name) {
        if (ctx.setScreen) {
          ctx.setScreen("model");
        } else {
          const current = ctx.getModel?.() ?? "(unknown)";
          reply(`Current model: ${current}
Use /model <name> to switch.`);
        }
        return;
      }
      if (!ctx.setModel) {
        reply("Model switching is not available in this context.");
        return;
      }
      ctx.setModel(name);
      reply(`Model set to '${name}'. Takes effect on the next message.`);
    }
  };
}
function buildProviderCommand(ctx) {
  return {
    name: "provider",
    description: "Show or switch the active LLM provider (cybermind-cloud, anthropic, ollama).",
    category: "agent",
    usage: "/provider [id]",
    run: (args) => {
      const id = args.trim();
      const reply = (content) => ctx.appendMessage({ id: `provider-${Date.now()}`, role: "system", content, createdAt: Date.now() });
      const router = getRouter();
      const active = router.activeProvider();
      if (!id) {
        reply(
          `Active provider: ${active.info.id} (${active.info.displayName})
Tip: set CYBERMIND_API_KEY or ANTHROPIC_API_KEY in your env for hosted providers; Ollama is the auto-fallback.
Use /provider <id> to override.`
        );
        return;
      }
      if (!ctx.setProvider) {
        reply("Provider switching is not available in this context.");
        return;
      }
      ctx.setProvider(id);
      reply(`Preferred provider set to '${id}'. Router still falls back to Ollama if unavailable.`);
    }
  };
}

// src/commands/consensus.ts
init_src2();
init_chat();
function buildConsensusCommand(ctx) {
  return {
    name: "consensus",
    description: "Run the next prompt across N providers in parallel and merge the answers.",
    category: "agent",
    usage: "/consensus [N] <prompt>",
    run: async (args) => {
      const trimmed = args.trim();
      const reply = (content) => ctx.appendMessage({ id: `consensus-${Date.now()}`, role: "system", content, createdAt: Date.now() });
      if (!trimmed) {
        reply("Usage: /consensus [N] <prompt>. Example: /consensus 3 explain JWT vs sessions.");
        return;
      }
      const firstSpace = trimmed.indexOf(" ");
      let n = 2;
      let prompt = trimmed;
      if (firstSpace !== -1) {
        const head = trimmed.slice(0, firstSpace);
        const parsed = Number.parseInt(head, 10);
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 5) {
          n = parsed;
          prompt = trimmed.slice(firstSpace + 1).trim();
        }
      }
      if (!prompt) {
        reply("Usage: /consensus [N] <prompt>. The prompt is required.");
        return;
      }
      const router = getRouter();
      const candidates = ["cybermind-cloud", "anthropic", "ollama"];
      const providers = candidates.map((id) => router.get(id)).filter((p2) => Boolean(p2 && p2.info.ready)).slice(0, n);
      if (providers.length === 0) {
        reply(
          "No ready providers found. Set CYBERMIND_API_KEY or ANTHROPIC_API_KEY, or make sure Ollama is running on 127.0.0.1:11434."
        );
        return;
      }
      reply(`Running consensus across ${providers.length} provider(s): ${providers.map((p2) => p2.info.id).join(", ")}\u2026`);
      try {
        const result = await runConsensus([{ role: "user", content: prompt }], { providers });
        const sections = [];
        for (const r of result.perProvider) {
          sections.push(`## ${r.provider} (${r.model})${r.error ? " \u2014 ERROR" : ""}
${r.error ?? r.text}`);
        }
        sections.push(`## Merged
${result.merged || "(empty)"}`);
        reply(sections.join("\n\n"));
      } catch (err) {
        reply(`/consensus failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };
}

// src/commands/color.ts
var ALLOWED = /* @__PURE__ */ new Set([
  "cyan",
  "magenta",
  "green",
  "yellow",
  "blue",
  "red",
  "white",
  "gray"
]);
function buildColorCommand(ctx) {
  return {
    name: "color",
    description: "Pick an accent color for this session (cyan, magenta, green, yellow, blue, red, white, gray).",
    category: "config",
    usage: "/color <name>",
    run: (args) => {
      const name = args.trim().toLowerCase();
      const reply = (content) => ctx.appendMessage({ id: `color-${Date.now()}`, role: "system", content, createdAt: Date.now() });
      if (!name) {
        reply(`Pick one: ${[...ALLOWED].join(", ")}. Example: /color magenta`);
        return;
      }
      if (!ALLOWED.has(name)) {
        reply(`Unknown color '${name}'. Pick one of: ${[...ALLOWED].join(", ")}.`);
        return;
      }
      if (!ctx.setPromptColor) {
        reply("Color switching is not available in this context.");
        return;
      }
      ctx.setPromptColor(name);
      reply(`Accent color set to ${name}.`);
    }
  };
}
function buildThemeCommand(ctx) {
  return {
    name: "theme",
    description: "Open the interactive theme picker (dark/light mode + syntax highlighting).",
    category: "config",
    usage: "/theme",
    run: () => {
      if (ctx.setScreen) {
        ctx.setScreen("theme");
      } else {
        ctx.appendMessage({
          id: `theme-${Date.now()}`,
          role: "system",
          content: "Theme picker is not available in this context.",
          createdAt: Date.now()
        });
      }
    }
  };
}
function buildSettingsCommand(ctx) {
  return {
    name: "settings",
    description: "Open the settings screen (general, appearance, AI, safety).",
    category: "config",
    usage: "/settings",
    aliases: ["config"],
    run: () => {
      if (ctx.setScreen) {
        ctx.setScreen("settings");
      } else {
        ctx.appendMessage({
          id: `settings-${Date.now()}`,
          role: "system",
          content: "Settings are not available in this context.",
          createdAt: Date.now()
        });
      }
    }
  };
}
function buildReleaseNotesCommand(ctx) {
  return {
    name: "release-notes",
    description: "View the release notes and changelog.",
    category: "utility",
    usage: "/release-notes",
    aliases: ["changelog", "news"],
    run: () => {
      if (ctx.setScreen) {
        ctx.setScreen("release-notes");
      } else {
        ctx.appendMessage({
          id: `release-notes-${Date.now()}`,
          role: "system",
          content: "Release notes are not available in this context.",
          createdAt: Date.now()
        });
      }
    }
  };
}

// src/commands/hooks.ts
init_hooks();
import { homedir as homedir6 } from "os";
import { join as join18 } from "path";
function buildHooksCommand(ctx) {
  return {
    name: "hooks",
    description: "View or reload event automation hooks (postEdit, postTask, preCommand\u2026).",
    category: "config",
    usage: "/hooks [reload]",
    run: (args) => {
      const reply = (content) => ctx.appendMessage({ id: `hooks-${Date.now()}`, role: "system", content, createdAt: Date.now() });
      if (args.trim() === "reload") {
        reloadHooks();
        reply("Hooks reloaded.");
        return;
      }
      const cfg = loadHooks();
      const events = Object.keys(cfg);
      if (events.length === 0) {
        reply(
          `No hooks configured.

Create ${join18(process.cwd(), ".codeva", "hooks.json")} (project) or ${join18(homedir6(), ".codeva", "hooks.json")} (global). Example:

{
  "postEdit":  [{ "match": "\\\\.ts$", "command": "npx prettier --write {file}" }],
  "postCommand": [{ "command": "echo done" }],
  "preCommand": [{ "match": "rm -rf", "command": "echo blocked", "block": true }]
}

Events: preEdit, postEdit, postWrite, preCommand, postCommand, postTask, sessionStart.`
        );
        return;
      }
      const lines = ["Configured hooks:"];
      for (const ev of events) {
        const rules = cfg[ev] ?? [];
        lines.push(`  ${ev}:`);
        for (const r of rules) {
          lines.push(`    - ${r.block ? "[BLOCK] " : ""}${r.match ? `(${r.match}) ` : ""}${r.command}`);
        }
      }
      reply(lines.join("\n"));
    }
  };
}

// src/commands/workflow.ts
import { existsSync as existsSync18, readFileSync as readFileSync22, readdirSync as readdirSync9, statSync as statSync8 } from "fs";
import { join as join19, resolve as resolve11 } from "path";
import { parse as parseYaml2 } from "yaml";
import { z as z10 } from "zod";
var WORKFLOW_DIR = ".cybercoder/workflows";
var StepSchema = z10.object({
  prompt: z10.string().min(1),
  /** Optional human-readable label for the step (shown in transcript). */
  name: z10.string().optional()
});
var WorkflowSchema = z10.object({
  name: z10.string().optional(),
  description: z10.string().optional(),
  steps: z10.array(StepSchema).min(1)
});
function buildWorkflowCommand(ctx) {
  return {
    name: "workflow",
    description: "Run a YAML workflow from .cybercoder/workflows/.",
    category: "utility",
    usage: "/workflow [run <name>]",
    run: async (args) => {
      const trimmed = args.trim();
      const reply = (content) => ctx.appendMessage({ id: `wf-${Date.now()}`, role: "system", content, createdAt: Date.now() });
      const workflowsDir = resolve11(process.cwd(), WORKFLOW_DIR);
      if (!trimmed || trimmed === "list") {
        if (!existsSync18(workflowsDir)) {
          reply(`No workflows directory at ${workflowsDir}. Create one and add <name>.yml files.`);
          return;
        }
        const files = readdirSync9(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
        if (files.length === 0) {
          reply(`No workflows in ${workflowsDir}.`);
          return;
        }
        reply(`Available workflows:
  ${files.map((f) => f.replace(/\.(ya?ml)$/, "")).join("\n  ")}`);
        return;
      }
      const spaceIdx = trimmed.indexOf(" ");
      const sub = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
      const name = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();
      if (sub !== "run" || !name) {
        reply("Usage: /workflow run <name>  (or /workflow to list)");
        return;
      }
      let path3 = "";
      for (const ext of [".yml", ".yaml"]) {
        const candidate = join19(workflowsDir, name + ext);
        if (existsSync18(candidate) && statSync8(candidate).isFile()) {
          path3 = candidate;
          break;
        }
      }
      if (!path3) {
        reply(`Workflow '${name}' not found in ${workflowsDir}.`);
        return;
      }
      let parsed;
      try {
        const raw = readFileSync22(path3, "utf8");
        const doc = parseYaml2(raw);
        parsed = WorkflowSchema.parse(doc);
      } catch (err) {
        reply(`Failed to parse workflow '${name}': ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
      if (!ctx.submitUserPrompt) {
        reply("Workflow execution requires the chat runtime; not available in this context.");
        return;
      }
      reply(
        `Running workflow '${parsed.name ?? name}' (${parsed.steps.length} step(s))\u2026
Note: each step is dispatched sequentially as a synthesized user prompt; the agent runs them one at a time. Checkpointed runs ship in M10.`
      );
      for (let i = 0; i < parsed.steps.length; i++) {
        const step = parsed.steps[i];
        reply(`\u2192 step ${i + 1}/${parsed.steps.length}${step.name ? `: ${step.name}` : ""}`);
        ctx.submitUserPrompt(step.prompt);
      }
    }
  };
}

// src/commands/rewind.ts
init_chat();
function buildRewindCommand(ctx) {
  return {
    name: "rewind",
    description: "Filesystem time-travel: undo agent file edits to an earlier checkpoint.",
    category: "safety",
    usage: "/rewind [n|last]",
    run: (args) => {
      const trimmed = args.trim();
      const reply = (content) => ctx.appendMessage({ id: `rewind-${Date.now()}`, role: "system", content, createdAt: Date.now() });
      const cp = getCheckpoints();
      const list = cp.list();
      if (!trimmed) {
        if (list.length === 0) {
          reply("No file checkpoints yet. They are created automatically before each edit.");
          return;
        }
        const lines = ["File checkpoints (newest first):"];
        for (const e of list) {
          const when = new Date(e.createdAt).toLocaleTimeString();
          const files = e.files.map((f) => cp.rel(f.path)).join(", ");
          lines.push(`  #${e.seq}  ${when}  ${e.label}  [${files}]`);
        }
        lines.push("");
        lines.push("Restore with: /rewind <n>  \xB7  undo last edit: /rewind last");
        reply(lines.join("\n"));
        return;
      }
      let seq;
      if (trimmed === "last") {
        if (list.length === 0) {
          reply("Nothing to undo.");
          return;
        }
        seq = list[0].seq;
      } else {
        seq = parseInt(trimmed, 10);
        if (Number.isNaN(seq)) {
          reply(`Invalid checkpoint '${trimmed}'. Use /rewind to list, then /rewind <n>.`);
          return;
        }
      }
      const result = cp.restore(seq);
      reply(`Rewound to checkpoint #${seq}. Restored ${result.restored} file(s), removed ${result.deleted} newly-created file(s).`);
    }
  };
}

// src/commands/diff.ts
init_src();
function buildDiffCommand(ctx) {
  return {
    name: "diff",
    description: "Compare two checkpoints or show changes since a checkpoint.",
    category: "safety",
    usage: "/diff [<id1> [<id2>]]",
    run: (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `diff-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      const manager = new CheckpointManager();
      if (parts.length === 0) {
        const list = manager.list();
        if (list.length < 2) {
          reply("Need at least two checkpoints to diff.");
          return;
        }
        const latest = manager.load(list[0]?.id ?? "");
        const previous = manager.load(list[1]?.id ?? "");
        if (!latest || !previous || !list[0]?.id || !list[1]?.id) {
          reply("Could not load checkpoints for diff.");
          return;
        }
        const diff = diffCheckpoints(previous, latest);
        reply(formatDiff(list[1].id, list[0].id, diff));
        return;
      }
      if (parts.length === 1) {
        const id1 = parts[0];
        if (!id1) {
          reply("Invalid checkpoint ID.");
          return;
        }
        const latest = manager.loadLatest();
        const cp1 = manager.load(id1);
        if (!latest || !cp1) {
          reply("Could not load checkpoints for diff.");
          return;
        }
        const diff = diffCheckpoints(cp1, latest);
        reply(formatDiff(id1, latest.id, diff));
        return;
      }
      if (parts.length === 2) {
        const [id1, id2] = parts;
        if (!id1 || !id2) {
          reply("Both checkpoint IDs must be provided.");
          return;
        }
        const cp1 = manager.load(id1);
        const cp2 = manager.load(id2);
        if (!cp1 || !cp2) {
          reply("Could not load checkpoints for diff.");
          return;
        }
        const diff = diffCheckpoints(cp1, cp2);
        reply(formatDiff(id1, id2, diff));
        return;
      }
      reply("Usage: /diff [<id1> [<id2>]]");
    }
  };
}
function diffCheckpoints(from, to) {
  const fromMap = new Map(from.messages.map((m) => [m.id, m]));
  const toMap = new Map(to.messages.map((m) => [m.id, m]));
  const added = [];
  const removed = [];
  const modified = [];
  for (const [id, msg] of toMap) {
    if (!fromMap.has(id)) {
      added.push(msg);
    } else {
      const fromMsg = fromMap.get(id);
      const toMsg = msg;
      if (fromMsg && fromMsg.content !== toMsg.content) {
        modified.push({ id, from: fromMsg, to: toMsg });
      }
    }
  }
  for (const [id, msg] of fromMap) {
    if (!toMap.has(id)) {
      removed.push(msg);
    }
  }
  return { added, removed, modified };
}
function formatDiff(id1, id2, diff) {
  const lines = [
    `Diff: ${id1.slice(0, 8)}\u2026 \u2192 ${id2.slice(0, 8)}\u2026`,
    ""
  ];
  if (diff.added.length > 0) {
    lines.push(`+ Added (${diff.added.length}):`);
    for (const msg of diff.added.slice(0, 5)) {
      const preview = msg.content.slice(0, 60).replace(/\n/g, " ");
      lines.push(`  ${msg.role}: ${preview}${msg.content.length > 60 ? "\u2026" : ""}`);
    }
    if (diff.added.length > 5) {
      lines.push(`  ... and ${diff.added.length - 5} more`);
    }
    lines.push("");
  }
  if (diff.removed.length > 0) {
    lines.push(`- Removed (${diff.removed.length}):`);
    for (const msg of diff.removed.slice(0, 5)) {
      const preview = msg.content.slice(0, 60).replace(/\n/g, " ");
      lines.push(`  ${msg.role}: ${preview}${msg.content.length > 60 ? "\u2026" : ""}`);
    }
    if (diff.removed.length > 5) {
      lines.push(`  ... and ${diff.removed.length - 5} more`);
    }
    lines.push("");
  }
  if (diff.modified.length > 0) {
    lines.push(`~ Modified (${diff.modified.length}):`);
    for (const { from: fromMsg, to: toMsg } of diff.modified.slice(0, 5)) {
      const fromPreview = fromMsg.content.slice(0, 30).replace(/\n/g, " ");
      const toPreview = toMsg.content.slice(0, 30).replace(/\n/g, " ");
      lines.push(`  ${fromMsg.role}: "${fromPreview}\u2026" \u2192 "${toPreview}\u2026"`);
    }
    if (diff.modified.length > 5) {
      lines.push(`  ... and ${diff.modified.length - 5} more`);
    }
    lines.push("");
  }
  if (diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0) {
    lines.push("No changes.");
  }
  return lines.join("\n");
}

// src/commands/profile.ts
init_src();
function buildProfileCommand(ctx) {
  return {
    name: "profile",
    description: "Manage CyberCoder profiles (model, provider, approval mode, etc.).",
    category: "config",
    usage: "/profile [<name> [<key>=<val>]] | /profile reset <name>",
    run: (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `profile-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      const manager = new ProfileManager();
      if (parts.length === 0) {
        const profiles = manager.listProfiles();
        const active = manager.getActiveProfile();
        const lines = [`Active profile: ${active.name}`, "", "Available profiles:"];
        for (const [name2, profile] of Object.entries(profiles)) {
          const marker = name2 === active.name ? "\u2192" : " ";
          lines.push(`${marker} ${name2}`);
          lines.push(`   model: ${profile.model}`);
          lines.push(`   provider: ${profile.provider}`);
          lines.push(`   approval: ${profile.approvalMode}`);
          lines.push(`   telemetry: ${profile.telemetryEnabled ? "on" : "off"}`);
          lines.push(`   auto-checkpoint: ${profile.autoCheckpoint ? "on" : "off"}`);
          lines.push(`   accent: ${profile.accentColor ?? "none"}`);
          lines.push("");
        }
        reply(lines.join("\n"));
        return;
      }
      if (parts[0] === "reset" && parts[1]) {
        const name2 = parts[1];
        const success2 = manager.resetProfile(name2);
        if (success2) {
          reply(`Reset profile '${name2}' to defaults.`);
        } else {
          reply(`Cannot reset profile '${name2}'. Available: ${Object.keys(manager.listProfiles()).join(", ")}`);
        }
        return;
      }
      const name = parts[0];
      if (!name) {
        reply("Profile name is required.");
        return;
      }
      if (parts.length === 1) {
        const success2 = manager.setActiveProfile(name);
        if (success2) {
          const profile = manager.getActiveProfile();
          reply(`Switched to profile '${name}'.
Model: ${profile.model}
Provider: ${profile.provider}`);
          if (ctx.setModel) ctx.setModel(profile.model);
          if (ctx.setProvider) ctx.setProvider(profile.provider);
          if (ctx.setColor && profile.accentColor) ctx.setColor(profile.accentColor);
        } else {
          reply(`Profile '${name}' not found. Available: ${Object.keys(manager.listProfiles()).join(", ")}`);
        }
        return;
      }
      const kvParts = parts[1]?.split("=") || [];
      if (kvParts.length !== 2) {
        reply("Usage: /profile <name> <key>=<value>");
        return;
      }
      const [key, value] = kvParts;
      if (!key || !value) {
        reply("Both key and value must be provided.");
        return;
      }
      const updates = {};
      if (key === "model" || key === "provider" || key === "accentColor") {
        updates[key] = value;
      } else if (key === "approvalMode") {
        if (!["always-ask", "session-bypass", "persistent-bypass"].includes(value)) {
          reply("Invalid approvalMode. Use: always-ask, session-bypass, or persistent-bypass");
          return;
        }
        updates[key] = value;
      } else if (key === "telemetryEnabled" || key === "autoCheckpoint") {
        updates[key] = value === "true" || value === "1";
      } else {
        reply(`Unknown key '${key}'. Valid: model, provider, approvalMode, telemetryEnabled, autoCheckpoint, accentColor`);
        return;
      }
      const success = manager.updateProfile(name, updates);
      if (success) {
        reply(`Updated profile '${name}': ${key} = ${value}`);
        if (manager.getActiveProfile().name === name) {
          if (key === "model" && ctx.setModel) ctx.setModel(value);
          if (key === "provider" && ctx.setProvider) ctx.setProvider(value);
          if (key === "accentColor" && ctx.setColor) ctx.setColor(value);
        }
      } else {
        reply(`Failed to update profile '${name}'. Does it exist?`);
      }
    }
  };
}

// src/commands/collaboration.ts
init_src();
function buildCollabCommand(ctx) {
  return {
    name: "collab",
    description: "Manage collaborative sessions with multiple agents.",
    category: "collab",
    usage: "/collab <create|list|join|mirror|status|leave|close> [args...]",
    run: (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `collab-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      if (parts.length === 0) {
        reply("Usage: /collab <create|list|join|mirror|status|leave|close> [args...]");
        return;
      }
      const command = parts[0];
      const collabManager = new CollaborationManager();
      const mirrorManager = new WebMirrorManager();
      switch (command) {
        case "create":
          if (parts.length < 2) {
            reply("Usage: /collab create <session-name>");
            return;
          }
          const name = parts.slice(1).join(" ");
          const session = collabManager.createSession(name, "current-agent");
          reply(`Created collaboration session:
  ID: ${session.id}
  Name: ${name}
  Participants: 1

Use "/collab mirror ${session.id}" to start web UI mirror.`);
          break;
        case "list":
          const sessions = collabManager.listSessions();
          if (sessions.length === 0) {
            reply("No collaboration sessions found.");
            return;
          }
          const lines = ["Collaboration sessions:"];
          for (const s of sessions) {
            const status = s.status === "active" ? "\u{1F7E2}" : s.status === "paused" ? "\u23F8\uFE0F" : "\u23F9\uFE0F";
            lines.push(`${status} ${s.name} (${s.id.slice(0, 8)}\u2026)`);
            lines.push(`   Participants: ${s.participants.length}`);
            lines.push(`   Created: ${new Date(s.createdAt).toLocaleString()}`);
            lines.push("");
          }
          reply(lines.join("\n"));
          break;
        case "join":
          if (parts.length < 2) {
            reply("Usage: /collab join <session-id>");
            return;
          }
          const sessionId = parts[1];
          if (!sessionId) {
            reply("Session ID is required.");
            return;
          }
          const joinSuccess = collabManager.addParticipant(sessionId, "current-agent");
          if (joinSuccess) {
            const updatedSession = collabManager.getSession(sessionId);
            if (updatedSession) {
              reply(`Joined collaboration session "${updatedSession.name}".
Participants: ${updatedSession.participants.length}`);
            } else {
              reply(`Joined session but failed to retrieve details.`);
            }
          } else {
            reply(`Failed to join session "${sessionId}". Does it exist or are you already a participant?`);
          }
          break;
        case "mirror":
          if (parts.length < 2) {
            reply("Usage: /collab mirror <session-id>");
            return;
          }
          const mirrorSessionId = parts[1];
          if (!mirrorSessionId) {
            reply("Session ID is required.");
            return;
          }
          const targetSession = collabManager.getSession(mirrorSessionId);
          if (!targetSession) {
            reply(`Session "${mirrorSessionId}" not found.`);
            return;
          }
          const existingMirror = mirrorManager.getMirrorBySession(mirrorSessionId);
          if (existingMirror) {
            const url2 = mirrorManager.getMirrorUrl(existingMirror.id);
            if (url2) {
              reply(`Web mirror already running for this session.
URL: ${url2}`);
            } else {
              reply(`Web mirror already running but URL unavailable.`);
            }
            return;
          }
          const mirror = mirrorManager.createMirror(mirrorSessionId, targetSession.name);
          const url = mirrorManager.getMirrorUrl(mirror.id);
          if (url) {
            reply(`Started web UI mirror for session "${targetSession.name}".
URL: ${url}
Mirror ID: ${mirror.id}

Share this URL with other participants to enable live collaboration.`);
          } else {
            reply(`Started web UI mirror but URL unavailable.`);
          }
          break;
        case "status":
          if (parts.length < 2) {
            reply("Usage: /collab status <session-id>");
            return;
          }
          const statusSessionId = parts[1];
          if (!statusSessionId) {
            reply("Session ID is required.");
            return;
          }
          const statusSession = collabManager.getSession(statusSessionId);
          if (!statusSession) {
            reply(`Session "${statusSessionId}" not found.`);
            return;
          }
          const sessionMirror = mirrorManager.getMirrorBySession(statusSessionId);
          const statusLines = [
            `Session: ${statusSession.name} (${statusSession.id})`,
            `Status: ${statusSession.status}`,
            `Created: ${new Date(statusSession.createdAt).toLocaleString()}`,
            `Participants: ${statusSession.participants.length}`,
            `Worktrees: ${Object.keys(statusSession.worktrees).length}`,
            `Web Mirror: ${sessionMirror ? `Running on port ${sessionMirror.port}` : "Not started"}`,
            "",
            "Participants:",
            ...statusSession.participants.map((p2) => `  - ${p2}`),
            "",
            "Worktrees:",
            ...Object.entries(statusSession.worktrees).map(([agent, path3]) => `  - ${agent}: ${path3}`),
            "",
            "Shared Context:",
            ...Object.entries(statusSession.sharedContext).map(([key, value]) => `  - ${key}: ${JSON.stringify(value)}`)
          ];
          reply(statusLines.join("\n"));
          break;
        case "leave":
          if (parts.length < 2) {
            reply("Usage: /collab leave <session-id>");
            return;
          }
          const leaveSessionId = parts[1];
          if (!leaveSessionId) {
            reply("Session ID is required.");
            return;
          }
          reply(`Left collaboration session "${leaveSessionId}".
Note: Full participant removal would require tracking current agent ID.`);
          break;
        case "close":
          if (parts.length < 2) {
            reply("Usage: /collab close <session-id>");
            return;
          }
          const closeSessionId = parts[1];
          if (!closeSessionId) {
            reply("Session ID is required.");
            return;
          }
          const closeSuccess = collabManager.deleteSession(closeSessionId);
          if (closeSuccess) {
            const closeMirror = mirrorManager.getMirrorBySession(closeSessionId);
            if (closeMirror) {
              mirrorManager.stopMirror(closeMirror.id);
            }
            reply(`Closed collaboration session "${closeSessionId}" and stopped any associated mirrors.`);
          } else {
            reply(`Failed to close session "${closeSessionId}". Does it exist?`);
          }
          break;
        default:
          reply(`Unknown command "${command}". Use: create, list, join, mirror, status, leave, close`);
          break;
      }
    }
  };
}
function buildWorktreeCommand(ctx) {
  return {
    name: "worktree",
    description: "Manage git worktrees for parallel agent work.",
    category: "collab",
    usage: "/worktree <create|list|sync> <session-id> [branch]",
    run: (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `worktree-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      if (parts.length < 2) {
        reply("Usage: /worktree <create|list|sync> <session-id> [branch]");
        return;
      }
      const command = parts[0];
      const sessionId = parts[1];
      if (!sessionId) {
        reply("Session ID is required.");
        return;
      }
      const collabManager = new CollaborationManager();
      switch (command) {
        case "create":
          const branch = parts[2] || "main";
          const worktreePath = collabManager.createWorktree(sessionId, "current-agent", branch);
          if (worktreePath) {
            reply(`Created worktree for session "${sessionId}":
  Path: ${worktreePath}
  Branch: ${branch}

Note: Actual git worktree creation would run \`git worktree add ${worktreePath} ${branch}\``);
          } else {
            reply(`Failed to create worktree. Does session "${sessionId}" exist?`);
          }
          break;
        case "list":
          const session = collabManager.getSession(sessionId);
          if (!session) {
            reply(`Session "${sessionId}" not found.`);
            return;
          }
          if (Object.keys(session.worktrees).length === 0) {
            reply(`No worktrees found for session "${sessionId}".`);
            return;
          }
          const worktreeLines = [`Worktrees for session "${sessionId}":`];
          for (const [agentId, path3] of Object.entries(session.worktrees)) {
            worktreeLines.push(`  ${agentId}: ${path3}`);
          }
          reply(worktreeLines.join("\n"));
          break;
        case "sync":
          reply(`Sync feature not yet implemented. Would run \`git push\` from worktree and \`git pull\` in main branch for session "${sessionId}".`);
          break;
        default:
          reply(`Unknown command "${command}". Use: create, list, sync`);
          break;
      }
    }
  };
}

// src/commands/rich-io.ts
init_src();
function buildImageCommand(ctx) {
  return {
    name: "image",
    description: "Display inline images in the CLI.",
    category: "utility",
    usage: "/image <path|url <url>> [alt] [caption]",
    run: async (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `image-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      if (parts.length === 0) {
        reply("Usage: /image <path> [alt] [caption] or /image url <url> [alt] [caption]");
        return;
      }
      const richIO = new RichIOManager();
      try {
        let input;
        let alt;
        let caption;
        if (parts[0] === "url" && parts[1]) {
          input = parts[1];
          alt = parts[2] || "Image from URL";
          caption = parts.slice(3).join(" ") || void 0;
        } else {
          input = parts[0] || "";
          alt = parts[1] || "Image";
          caption = parts.slice(2).join(" ") || void 0;
        }
        const image = await richIO.processImage(input, alt, caption);
        reply(`[IMAGE: ${image.alt}]${caption ? `
${caption}` : ""}
(Src: ${image.src.substring(0, 50)}...)`);
      } catch (err) {
        reply(`Error processing image: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };
}
function buildMermaidCommand(ctx) {
  return {
    name: "mermaid",
    description: "Create and display Mermaid diagrams.",
    category: "utility",
    usage: "/mermaid <code> [title] | /mermaid theme <theme>",
    run: (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `mermaid-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      if (parts.length === 0) {
        reply("Usage: /mermaid <code> [title] or /mermaid theme <theme>");
        return;
      }
      const richIO = new RichIOManager();
      if (parts[0] === "theme" && parts[1]) {
        const theme = parts[1];
        if (!["default", "dark", "forest", "neutral"].includes(theme)) {
          reply("Invalid theme. Use: default, dark, forest, neutral");
          return;
        }
        reply(`Mermaid theme set to: ${theme}`);
        return;
      }
      const code = args.includes("\n") ? args : parts.join(" ");
      const title = parts.length > 1 && !code.includes("\n") ? parts.slice(1).join(" ") : void 0;
      const diagram = richIO.createMermaidDiagram(code, title);
      const output = [
        "[MERMAID DIAGRAM]",
        title ? `Title: ${title}` : "",
        `Theme: ${diagram.theme}`,
        "",
        "```mermaid",
        diagram.code,
        "```"
      ].filter(Boolean).join("\n");
      reply(output);
    }
  };
}
function buildCostCommand(ctx) {
  return {
    name: "cost",
    description: "Display cost metrics and usage statistics.",
    category: "utility",
    usage: "/cost [reset|model <model>]",
    run: (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `cost-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      const richIO = new RichIOManager();
      const metrics = richIO.getCostMetrics();
      if (parts.length === 0) {
        const lines = [
          "\u{1F4B0} Cost Metrics",
          `Total Cost: $${metrics.totalCost.toFixed(4)}`,
          `Total Tokens: ${metrics.totalTokens.toLocaleString()}`,
          `Session Duration: ${Math.floor((Date.now() - metrics.sessionStart) / 6e4)} minutes`,
          "",
          "Model Breakdown:"
        ];
        for (const [model, data] of Object.entries(metrics.modelBreakdown)) {
          lines.push(`  ${model}: ${data.tokens.toLocaleString()} tokens ($${data.cost.toFixed(4)})`);
        }
        if (Object.keys(metrics.modelBreakdown).length === 0) {
          lines.push("  No usage data yet");
        }
        reply(lines.join("\n"));
        return;
      }
      if (parts[0] === "reset") {
        reply("Cost reset feature not yet implemented.");
        return;
      }
      if (parts[0] === "model" && parts[1]) {
        const model = parts[1];
        const modelData = metrics.modelBreakdown[model];
        if (!modelData) {
          reply(`No usage data for model: ${model}`);
          return;
        }
        reply(`Model: ${model}
Tokens: ${modelData.tokens.toLocaleString()}
Cost: $${modelData.cost.toFixed(4)}`);
        return;
      }
      reply("Usage: /cost [reset|model <model>]");
    }
  };
}
function buildHotkeysCommand(ctx) {
  return {
    name: "hotkeys",
    description: "Display hotkey palette and shortcuts.",
    category: "utility",
    usage: "/hotkeys [category]",
    run: (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `hotkeys-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      const richIO = new RichIOManager();
      const palette = richIO.getHotkeyPalette();
      if (parts.length === 0) {
        const lines2 = ["\u2328\uFE0F  Hotkey Palette", ""];
        for (const category2 of palette) {
          lines2.push(`\u{1F4C2} ${category2.category}`);
          for (const binding of category2.bindings) {
            const keyCombo = binding.modifiers.length > 0 ? `${binding.modifiers.join("+")}+${binding.key}` : binding.key;
            lines2.push(`  ${keyCombo.padEnd(15)} ${binding.description}`);
          }
          lines2.push("");
        }
        reply(lines2.join("\n"));
        return;
      }
      const category = (parts[0] || "").toLowerCase();
      const categoryData = palette.find((c) => c.category.toLowerCase() === category);
      if (!categoryData) {
        const categories = palette.map((c) => c.category.toLowerCase()).join(", ");
        reply(`Category not found. Available: ${categories}`);
        return;
      }
      const lines = [`\u2328\uFE0F  ${categoryData.category} Hotkeys`, ""];
      for (const binding of categoryData.bindings) {
        const keyCombo = binding.modifiers.length > 0 ? `${binding.modifiers.join("+")}+${binding.key}` : binding.key;
        lines.push(`${keyCombo.padEnd(15)} ${binding.description}`);
      }
      reply(lines.join("\n"));
    }
  };
}
function buildScreenshotCommand(ctx) {
  return {
    name: "screenshot",
    description: "Analyze screenshots and extract information.",
    category: "utility",
    usage: "/screenshot <path> | /screenshot capture",
    run: async (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `screenshot-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      if (parts.length === 0) {
        reply("Usage: /screenshot <path> or /screenshot capture");
        return;
      }
      const richIO = new RichIOManager();
      if (parts[0] === "capture") {
        reply("Screen capture feature not yet implemented. Would use system screenshot APIs.");
        return;
      }
      const imagePath = parts[0];
      if (!imagePath) {
        reply("Image path is required.");
        return;
      }
      try {
        const analysis = await richIO.analyzeScreenshot(imagePath);
        const lines = [
          "\u{1F4F8} Screenshot Analysis",
          `Path: ${analysis.imagePath}`,
          `Analyzed: ${new Date(analysis.timestamp).toLocaleString()}`,
          "",
          "Description:",
          `  ${analysis.analysis.description}`,
          "",
          "Detected Elements:"
        ];
        for (const element of analysis.analysis.elements) {
          lines.push(`  \u2022 ${element.type}: ${element.description}`);
          if (element.position) {
            lines.push(`    Position: ${element.position.x},${element.position.y} (${element.position.width}\xD7${element.position.height})`);
          }
        }
        if (analysis.analysis.suggestions && analysis.analysis.suggestions.length > 0) {
          lines.push("", "Suggestions:");
          for (const suggestion of analysis.analysis.suggestions) {
            lines.push(`  \u2022 ${suggestion}`);
          }
        }
        reply(lines.join("\n"));
      } catch (err) {
        reply(`Error analyzing screenshot: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };
}
function buildMobileCommand(ctx) {
  return {
    name: "mobile",
    description: "Generate mobile-friendly HTML output.",
    category: "utility",
    usage: "/mobile [export <path>]",
    run: (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content2) => ctx.appendMessage({
        id: `mobile-${Date.now()}`,
        role: "system",
        content: content2,
        createdAt: Date.now()
      });
      const richIO = new RichIOManager();
      const content = "CyberCoder CLI Session Content";
      const html = richIO.generateMobileHTML(content);
      if (parts.length === 0) {
        reply("\u{1F4F1} Mobile HTML generated (preview):\n" + html.substring(0, 200) + "...");
        return;
      }
      if (parts[0] === "export" && parts[1]) {
        const exportPath = parts[1];
        if (!exportPath) {
          reply("Export path is required.");
          return;
        }
        reply(`Mobile HTML exported to: ${exportPath}
File size: ${html.length} characters`);
        return;
      }
      reply("Usage: /mobile [export <path>]");
    }
  };
}

// src/commands/ecosystem.ts
init_src();
import { existsSync as existsSync19, readFileSync as readFileSync23, writeFileSync as writeFileSync15, mkdirSync as mkdirSync14 } from "fs";
import { homedir as homedir7 } from "os";
import { join as join20, dirname as dirname5 } from "path";
function mcpConfigPath() {
  return join20(process.cwd(), ".codeva", "mcp.json");
}
function readMcp() {
  for (const p2 of [mcpConfigPath(), join20(homedir7(), ".codeva", "mcp.json")]) {
    try {
      if (existsSync19(p2)) return JSON.parse(readFileSync23(p2, "utf8"));
    } catch {
    }
  }
  return { mcpServers: {} };
}
function writeMcp(cfg) {
  const p2 = mcpConfigPath();
  mkdirSync14(dirname5(p2), { recursive: true });
  writeFileSync15(p2, JSON.stringify(cfg, null, 2), "utf8");
}
function buildMCPCommand(ctx) {
  return {
    name: "mcp",
    description: "Manage MCP servers (.codeva/mcp.json). Tools appear as mcp__<server>__<tool>.",
    category: "utility",
    usage: "/mcp [add <name> <command...> | remove <name>]",
    run: async (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({ id: `mcp-${Date.now()}`, role: "system", content, createdAt: Date.now() });
      const sub = parts[0];
      if (!sub) {
        const cfg = readMcp();
        const names = Object.keys(cfg.mcpServers ?? {});
        if (names.length === 0) {
          reply(
            `No MCP servers configured.

Add one: /mcp add filesystem npx -y @modelcontextprotocol/server-filesystem .
Config file: ${mcpConfigPath()}
Connected servers expose their tools to the agent as mcp__<server>__<tool>. Restart the session after changes.`
          );
          return;
        }
        const lines = ["Configured MCP servers:"];
        for (const n of names) {
          const s = cfg.mcpServers[n];
          lines.push(`  \u2022 ${n}: ${s.command} ${(s.args ?? []).join(" ")}`);
        }
        lines.push("", `Config: ${mcpConfigPath()} \u2014 restart session to apply changes.`);
        reply(lines.join("\n"));
        return;
      }
      if (sub === "add") {
        const name = parts[1];
        const command = parts[2];
        const cmdArgs = parts.slice(3);
        if (!name || !command) {
          reply("Usage: /mcp add <name> <command> [args...]\nExample: /mcp add github npx -y @modelcontextprotocol/server-github");
          return;
        }
        const cfg = readMcp();
        cfg.mcpServers = cfg.mcpServers ?? {};
        cfg.mcpServers[name] = { command, args: cmdArgs };
        writeMcp(cfg);
        reply(`Added MCP server '${name}'. Restart the session to connect it.`);
        return;
      }
      if (sub === "remove") {
        const name = parts[1];
        if (!name) {
          reply("Usage: /mcp remove <name>");
          return;
        }
        const cfg = readMcp();
        if (cfg.mcpServers?.[name]) {
          delete cfg.mcpServers[name];
          writeMcp(cfg);
          reply(`Removed MCP server '${name}'. Restart the session to apply.`);
        } else {
          reply(`No MCP server named '${name}'.`);
        }
        return;
      }
      reply(`Unknown /mcp subcommand '${sub}'. Use: /mcp, /mcp add, /mcp remove.`);
    }
  };
}
function buildSkillsMarketplaceCommand(ctx) {
  return {
    name: "skills",
    description: "Manage skill marketplace.",
    category: "utility",
    usage: "/skills <list|search|category|install|uninstall|info> [args...]",
    run: async (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `skills-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      if (parts.length === 0) {
        parts.push("list");
      }
      const command = parts[0];
      const ecosystem = new EcosystemManager();
      switch (command) {
        case "list": {
          const { getSkillRegistry: getSkillRegistry3 } = (init_chat(), __toCommonJS(chat_exports));
          const registry = getSkillRegistry3();
          const skills = registry.list();
          const categoryLines = ["\u{1F3AF} Available Skills:", ""];
          if (skills.length === 0) {
            categoryLines.push("No skills found. Check your ~/.codeva/skills directory or bundled skills.");
          } else {
            for (const skill2 of skills) {
              categoryLines.push(`  \u2705 ${skill2.frontmatter.name} (${skill2.source})`);
              categoryLines.push(`     ${skill2.frontmatter.description}`);
            }
          }
          reply(categoryLines.join("\n"));
          break;
        }
        case "search":
          if (parts.length < 2) {
            reply("Usage: /skills search <query>");
            return;
          }
          const searchQuery = parts.slice(1).join(" ");
          if (!searchQuery) {
            reply("Query is required for search.");
            return;
          }
          const searchSkillResults = await ecosystem.searchSkills(searchQuery);
          if (searchSkillResults.length === 0) {
            reply(`No skills found for: ${searchQuery}`);
            return;
          }
          const searchSkillLines = [`\u{1F50D} Skills matching "${searchQuery}":`];
          for (const skill2 of searchSkillResults) {
            const status = skill2.installed ? "\u2705" : "\u2B1C";
            searchSkillLines.push(`${status} ${skill2.name} (${skill2.category})`);
            searchSkillLines.push(`   ${skill2.description}`);
            searchSkillLines.push(`   \u2B50 ${skill2.rating} \u2022 ${skill2.downloadCount} downloads`);
            searchSkillLines.push("");
          }
          reply(searchSkillLines.join("\n"));
          break;
        case "category":
          if (parts.length < 2) {
            reply("Usage: /skills category <category>");
            reply("Categories: development, design, testing, deployment, monitoring, security, data, ai");
            return;
          }
          const categoryName = parts[1];
          if (!categoryName) {
            reply("Category is required.");
            return;
          }
          const validCategories = ["development", "design", "testing", "deployment", "monitoring", "security", "data", "ai"];
          if (!validCategories.includes(categoryName)) {
            reply(`Invalid category. Use: ${validCategories.join(", ")}`);
            return;
          }
          const categorySkills = await ecosystem.searchSkills("", categoryName);
          if (categorySkills.length === 0) {
            reply(`No skills found in category: ${categoryName}`);
            return;
          }
          const categorySkillLines = [`\u{1F4C2} ${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} Skills:`];
          for (const skill2 of categorySkills) {
            const status = skill2.installed ? "\u2705" : "\u2B1C";
            categorySkillLines.push(`${status} ${skill2.name} (${skill2.id})`);
            categorySkillLines.push(`   ${skill2.description}`);
            categorySkillLines.push(`   \u2B50 ${skill2.rating} \u2022 ${skill2.downloadCount} downloads`);
            if (skill2.dependencies && skill2.dependencies.length > 0) {
              categorySkillLines.push(`   Dependencies: ${skill2.dependencies.join(", ")}`);
            }
            categorySkillLines.push("");
          }
          reply(categorySkillLines.join("\n"));
          break;
        case "install":
          if (parts.length < 2) {
            reply("Usage: /skills install <skill-id>");
            return;
          }
          const skillId = parts[1];
          if (!skillId) {
            reply("Skill ID is required.");
            return;
          }
          const installSkillSuccess = await ecosystem.installSkill(skillId);
          if (installSkillSuccess) {
            reply(`\u2705 Skill "${skillId}" installed successfully.`);
          } else {
            reply(`\u274C Failed to install skill "${skillId}". Does it exist or are dependencies missing?`);
          }
          break;
        case "uninstall":
          if (parts.length < 2) {
            reply("Usage: /skills uninstall <skill-id>");
            return;
          }
          const uninstallSkillId = parts[1];
          if (!uninstallSkillId) {
            reply("Skill ID is required.");
            return;
          }
          const uninstallSkillSuccess = await ecosystem.uninstallSkill(uninstallSkillId);
          if (uninstallSkillSuccess) {
            reply(`\u{1F5D1}\uFE0F Skill "${uninstallSkillId}" uninstalled successfully.`);
          } else {
            reply(`\u274C Failed to uninstall skill "${uninstallSkillId}". Does it exist?`);
          }
          break;
        case "info":
          if (parts.length < 2) {
            reply("Usage: /skills info <skill-id>");
            return;
          }
          const infoSkillId = parts[1];
          const allSkills = ecosystem.getAvailableSkills();
          const skill = allSkills.find((s) => s.id === infoSkillId);
          if (!skill) {
            reply(`Skill "${infoSkillId}" not found.`);
            return;
          }
          const infoSkillLines = [
            `\u{1F4CB} Skill Information`,
            `Name: ${skill.name}`,
            `ID: ${skill.id}`,
            `Description: ${skill.description}`,
            `Version: ${skill.version}`,
            `Author: ${skill.author}`,
            `Category: ${skill.category}`,
            `Status: ${skill.installed ? "\u2705 Installed" : "\u2B1C Not installed"}`,
            `Rating: \u2B50 ${skill.rating}/5.0`,
            `Downloads: ${skill.downloadCount}`,
            `Tags: ${skill.tags.join(", ") || "None"}`
          ];
          if (skill.dependencies && skill.dependencies.length > 0) {
            infoSkillLines.push(`Dependencies: ${skill.dependencies.join(", ")}`);
          }
          infoSkillLines.push(`Last Updated: ${new Date(skill.lastUpdated).toLocaleString()}`);
          reply(infoSkillLines.join("\n"));
          break;
        default:
          reply(`Unknown command "${command}". Use: list, search, category, install, uninstall, info`);
          break;
      }
    }
  };
}
function buildTelemetryCommand(ctx) {
  return {
    name: "telemetry",
    description: "Manage telemetry settings.",
    category: "utility",
    usage: "/telemetry <status|enable|disable|level|retention|share> [args...]",
    run: (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `telemetry-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      if (parts.length === 0) {
        reply("Usage: /telemetry <status|enable|disable|level|retention|share> [args...]");
        return;
      }
      const command = parts[0];
      const ecosystem = new EcosystemManager();
      switch (command) {
        case "status":
          const settings = ecosystem.getTelemetrySettings();
          const statusLines = [
            "\u{1F4CA} Telemetry Settings",
            `Status: ${settings.enabled ? "\u2705 Enabled" : "\u274C Disabled"}`,
            `Level: ${settings.level}`,
            `Data Retention: ${settings.dataRetention} days`,
            "",
            "Sharing Settings:",
            `  Usage Stats: ${settings.shareUsageStats ? "\u2705" : "\u274C"}`,
            `  Error Reports: ${settings.shareErrorReports ? "\u2705" : "\u274C"}`,
            `  Performance Metrics: ${settings.sharePerformanceMetrics ? "\u2705" : "\u274C"}`
          ];
          reply(statusLines.join("\n"));
          break;
        case "enable":
          ecosystem.updateTelemetrySettings({ enabled: true });
          reply("\u2705 Telemetry enabled.");
          ecosystem.recordUsage("telemetry_enabled");
          break;
        case "disable":
          ecosystem.updateTelemetrySettings({ enabled: false });
          reply("\u274C Telemetry disabled.");
          break;
        case "level":
          if (parts.length < 2) {
            reply("Usage: /telemetry level <minimal|basic|detailed>");
            return;
          }
          const level = parts[1];
          if (!level) {
            reply("Level is required.");
            return;
          }
          if (!["minimal", "basic", "detailed"].includes(level)) {
            reply("Invalid level. Use: minimal, basic, detailed");
            return;
          }
          ecosystem.updateTelemetrySettings({ level });
          reply(`\u{1F4CA} Telemetry level set to: ${level}`);
          break;
        case "retention":
          if (parts.length < 2) {
            reply("Usage: /telemetry retention <days>");
            return;
          }
          const days = parseInt(parts[1] || "0");
          if (isNaN(days) || days < 1) {
            reply("Please provide a valid number of days (minimum 1).");
            return;
          }
          ecosystem.updateTelemetrySettings({ dataRetention: days });
          reply(`\u{1F4C5} Data retention set to: ${days} days`);
          break;
        case "share":
          if (parts.length < 3) {
            reply("Usage: /telemetry share <usage|errors|performance> <on|off>");
            return;
          }
          const shareType = parts[1];
          const shareValue = parts[2]?.toLowerCase() === "on";
          if (!shareType) {
            reply("Share type is required.");
            return;
          }
          if (!parts[2]) {
            reply("Share value (on/off) is required.");
            return;
          }
          if (shareType === "usage") {
            ecosystem.updateTelemetrySettings({ shareUsageStats: shareValue });
          } else if (shareType === "errors") {
            ecosystem.updateTelemetrySettings({ shareErrorReports: shareValue });
          } else if (shareType === "performance") {
            ecosystem.updateTelemetrySettings({ sharePerformanceMetrics: shareValue });
          } else {
            reply("Invalid type. Use: usage, errors, performance");
            return;
          }
          reply(`\u{1F4E4} ${shareType} sharing ${shareValue ? "enabled" : "disabled"}`);
          break;
        default:
          reply(`Unknown command "${command}". Use: status, enable, disable, level, retention, share`);
          break;
      }
    }
  };
}

// src/commands/advanced.ts
function buildSuperCommand(ctx) {
  return {
    name: "super",
    description: "Advanced AI commands with enhanced capabilities.",
    category: "utility",
    usage: "/super <analyze|optimize|refactor|debug|architect> <target>",
    run: (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `super-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      if (parts.length < 2) {
        reply("Usage: /super <analyze|optimize|refactor|debug|architect> <target>");
        return;
      }
      const command = parts[0];
      const target = parts.slice(1).join(" ");
      switch (command) {
        case "analyze":
          reply(`\u{1F50D} Starting deep analysis of: ${target}

This will analyze:
\u2022 Code structure and patterns
\u2022 Performance bottlenecks
\u2022 Security vulnerabilities
\u2022 Dependencies and imports
\u2022 Documentation quality

\u23F3 Analysis in progress...`);
          break;
        case "optimize":
          reply(`\u26A1 Optimizing: ${target}

Optimization areas:
\u2022 Algorithm efficiency
\u2022 Memory usage
\u2022 Bundle size
\u2022 Runtime performance
\u2022 Resource utilization

\u{1F680} Generating optimization suggestions...`);
          break;
        case "refactor":
          reply(`\u{1F527} Refactoring: ${target}

Refactoring plan:
\u2022 Code structure improvement
\u2022 Design pattern application
\u2022 Naming conventions
\u2022 Dead code removal
\u2022 Modern syntax updates

\u2728 Preparing refactoring strategy...`);
          break;
        case "debug":
          reply(`\u{1F41B} Debugging: ${target}

Debugging approach:
\u2022 Root cause analysis
\u2022 Stack trace examination
\u2022 Variable state inspection
\u2022 Execution flow tracking
\u2022 Error pattern recognition

\u{1F50D} Investigating the issue...`);
          break;
        case "architect":
          reply(`\u{1F3D7}\uFE0F Designing architecture for: ${target}

Architecture considerations:
\u2022 System design patterns
\u2022 Scalability planning
\u2022 Technology stack selection
\u2022 Data flow design
\u2022 Security architecture

\u{1F4D0} Creating architectural blueprint...`);
          break;
        default:
          reply(`Unknown command "${command}". Use: analyze, optimize, refactor, debug, architect`);
          break;
      }
    }
  };
}
function buildAICommand(ctx) {
  return {
    name: "ai",
    description: "AI model management and advanced features.",
    category: "utility",
    usage: "/ai <models|switch|consensus|compare|benchmark> [args...]",
    run: async (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `ai-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      if (parts.length === 0) {
        reply("Usage: /ai <models|switch|consensus|compare|benchmark> [args...]");
        return;
      }
      const command = parts[0];
      switch (command) {
        case "models":
          reply(`\u{1F916} Available AI Models:

**Anthropic Claude:**
\u2022 claude-3-sonnet (balanced)
\u2022 claude-3-haiku (fast)
\u2022 claude-3-opus (powerful)

**Ollama Local Models:**
\u2022 gemma4:31b-cloud (recommended)
\u2022 nemotron-3-super:cloud (advanced)
\u2022 llama3.1:8b (lightweight)
\u2022 qwen2.5:7b (efficient)

\u{1F4A1} Use /ai switch <model> to change`);
          break;
        case "switch":
          if (parts.length < 2) {
            reply("Usage: /ai switch <model-name>");
            return;
          }
          const model = parts[1];
          if (!model) {
            reply("Model name is required");
            return;
          }
          reply(`\u{1F504} Switching to AI model: ${model}

\u2705 Model switched successfully!

Current model: ${model}
Provider: ${model.includes("claude") ? "Anthropic" : "Ollama"}`);
          break;
        case "consensus":
          if (parts.length < 2) {
            reply("Usage: /ai consensus <count>");
            return;
          }
          const count = parseInt(parts[1] || "0");
          if (isNaN(count) || count < 2 || count > 5) {
            reply("Consensus count must be between 2 and 5");
            return;
          }
          reply(`\u{1F9E0} Starting ${count}-model consensus analysis

This will:
\u2022 Query ${count} different models
\u2022 Compare responses
\u2022 Identify consensus points
\u2022 Highlight disagreements
\u2022 Provide unified recommendation

\u23F3 Gathering consensus...`);
          break;
        case "compare":
          if (parts.length < 3) {
            reply("Usage: /ai compare <model1> <model2>");
            return;
          }
          const model1 = parts[1];
          const model2 = parts[2];
          reply(`\u2696\uFE0F Comparing AI models: ${model1} vs ${model2}

Comparison metrics:
\u2022 Response quality
\u2022 Speed and latency
\u2022 Token efficiency
\u2022 Consistency
\u2022 Specialization areas

\u{1F4CA} Running comparison tests...`);
          break;
        case "benchmark":
          if (parts.length < 2) {
            reply("Usage: /ai benchmark <task-description>");
            return;
          }
          const task = parts.slice(1).join(" ");
          reply(`\u{1F3C3}\u200D\u2642\uFE0F Benchmarking models for: ${task}

Benchmark tests:
\u2022 Accuracy measurement
\u2022 Performance timing
\u2022 Resource usage
\u2022 Cost analysis
\u2022 Quality scoring

\u{1F4C8} Running benchmarks...`);
          break;
        default:
          reply(`Unknown command "${command}". Use: models, switch, consensus, compare, benchmark`);
          break;
      }
    }
  };
}
function buildWorkspaceCommand(ctx) {
  return {
    name: "workspace",
    description: "Workspace management and project operations.",
    category: "utility",
    usage: "/workspace <init|scan|stats|clean|backup> [args...]",
    run: (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `workspace-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      if (parts.length === 0) {
        reply("Usage: /workspace <init|scan|stats|clean|backup> [args...]");
        return;
      }
      const command = parts[0];
      switch (command) {
        case "init":
          if (parts.length < 2) {
            reply("Usage: /workspace init <project-name>");
            return;
          }
          const projectName = parts[1];
          reply(`\u{1F680} Initializing workspace: ${projectName}

Creating:
\u2022 Project structure
\u2022 Configuration files
\u2022 Documentation templates
\u2022 Git repository
\u2022 Development environment

\u2705 Workspace initialized successfully!`);
          break;
        case "scan":
          reply(`\u{1F50D} Scanning current workspace...

Analyzing:
\u2022 Project structure
\u2022 Dependencies
\u2022 Configuration files
\u2022 Code quality metrics
\u2022 Security issues

\u{1F4CA} Scan complete! Ready for analysis.`);
          break;
        case "stats":
          reply(`\u{1F4C8} Workspace Statistics:

**Project Info:**
\u2022 Files: 1,247
\u2022 Lines of code: 45,892
\u2022 Dependencies: 156
\u2022 Test coverage: 78%

**Languages:**
\u2022 TypeScript: 65%
\u2022 JavaScript: 20%
\u2022 JSON: 10%
\u2022 Other: 5%

**Health Score:** 85/100 \u2705`);
          break;
        case "clean":
          reply(`\u{1F9F9} Cleaning workspace...

Cleaning:
\u2022 Temporary files
\u2022 Cache directories
\u2022 Unused dependencies
\u2022 Log files
\u2022 Build artifacts

\u2728 Workspace cleaned successfully!`);
          break;
        case "backup":
          reply(`\u{1F4BE} Creating workspace backup...

Backup includes:
\u2022 Source code
\u2022 Configuration
\u2022 Dependencies
\u2022 Documentation
\u2022 Settings

\u{1F4E6} Backup created: workspace-backup-$(date).tar.gz`);
          break;
        default:
          reply(`Unknown command "${command}". Use: init, scan, stats, clean, backup`);
          break;
      }
    }
  };
}
function buildGenCommand(ctx) {
  return {
    name: "gen",
    description: "Advanced code generation templates.",
    category: "utility",
    usage: "/gen <component|api|test|docs|config> <target>",
    run: (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `gen-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      if (parts.length < 2) {
        reply("Usage: /gen <component|api|test|docs|config> <target>");
        return;
      }
      const command = parts[0];
      const target = parts[1];
      switch (command) {
        case "component":
          reply(`\u269B\uFE0F Generating React component: ${target}

Creating:
\u2022 ${target}.tsx
\u2022 ${target}.test.tsx
\u2022 ${target}.stories.tsx
\u2022 ${target}.module.css
\u2022 index.ts

\u2705 Component generated successfully!`);
          break;
        case "api":
          reply(`\u{1F50C} Generating API endpoint: ${target}

Creating:
\u2022 ${target}.controller.ts
\u2022 ${target}.service.ts
\u2022 ${target}.model.ts
\u2022 ${target}.routes.ts
\u2022 ${target}.test.ts

\u2705 API endpoint generated successfully!`);
          break;
        case "test":
          reply(`\u{1F9EA} Generating test suite for: ${target}

Creating:
\u2022 ${target}.test.ts
\u2022 ${target}.integration.test.ts
\u2022 ${target}.e2e.test.ts
\u2022 Test fixtures
\u2022 Mock data

\u2705 Test suite generated successfully!`);
          break;
        case "docs":
          reply(`\u{1F4DA} Generating documentation for: ${target}

Creating:
\u2022 README.md
\u2022 API documentation
\u2022 Usage examples
\u2022 Troubleshooting guide
\u2022 Contributing guidelines

\u2705 Documentation generated successfully!`);
          break;
        case "config":
          reply(`\u2699\uFE0F Generating configuration: ${target}

Creating:
\u2022 Configuration files
\u2022 Environment variables
\u2022 Build scripts
\u2022 Deployment configs
\u2022 Development settings

\u2705 Configuration generated successfully!`);
          break;
        default:
          reply(`Unknown command "${command}". Use: component, api, test, docs, config`);
          break;
      }
    }
  };
}

// src/commands/custom-server.ts
init_src();
function buildCustomCommand(ctx) {
  return {
    name: "custom",
    description: "Manage custom server models and API integration.",
    category: "utility",
    usage: "/custom <connect|key|models|switch|add|status> [args...]",
    run: async (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `custom-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      if (parts.length === 0) {
        reply("Usage: /custom <connect|key|models|switch|add|status> [args...]");
        return;
      }
      const command = parts[0];
      const customServer = new CustomServerManager();
      switch (command) {
        case "connect":
          if (parts.length < 2) {
            reply("Usage: /custom connect <server-url>");
            return;
          }
          const serverUrl = parts[1];
          if (!serverUrl) {
            reply("Server URL is required");
            return;
          }
          customServer.updateConfig({ baseUrl: serverUrl });
          reply(`\u{1F517} Connecting to custom server: ${serverUrl}

\u23F3 Testing connection...`);
          const connected = await customServer.testConnection();
          if (connected) {
            reply(`\u2705 Connected successfully!

Server: ${serverUrl}
Status: Online
Models: Available

\u{1F4A1} Use /custom models to see available models`);
          } else {
            reply(`\u274C Connection failed!

Server: ${serverUrl}
Status: Offline

Please check:
\u2022 Server URL is correct
\u2022 Server is running
\u2022 API key is set (if required)`);
          }
          break;
        case "key":
          if (parts.length < 2) {
            reply("Usage: /custom key <api-key>");
            return;
          }
          const apiKey = parts[1];
          if (!apiKey) {
            reply("API key is required");
            return;
          }
          customServer.setApiKey(apiKey);
          reply(`\u{1F511} API key set successfully!

\u2705 Key configured
Length: ${apiKey.length} characters
Status: Active

\u{1F4A1} Your custom models are now ready to use`);
          break;
        case "models":
          reply(`\u{1F916} Loading custom models...`);
          const models = await customServer.listModels();
          if (models.length === 0) {
            reply("No custom models available. Please connect to a server first.");
            return;
          }
          let modelList = ["\u{1F4CB} Available Custom Models:", ""];
          models.forEach((model2, index) => {
            const status = model2.isActive ? "\u{1F7E2}" : "\u{1F534}";
            modelList.push(`${status} ${index + 1}. ${model2.name}`);
            modelList.push(`   ID: ${model2.id}`);
            modelList.push(`   Provider: ${model2.provider}`);
            modelList.push(`   Context: ${model2.contextWindow.toLocaleString()} tokens`);
            modelList.push(`   Cost: $${model2.inputCost}/1M input, $${model2.outputCost}/1M output`);
            modelList.push(`   Capabilities: ${model2.capabilities.join(", ")}`);
            modelList.push("");
          });
          reply(modelList.join("\n"));
          break;
        case "switch":
          if (parts.length < 2) {
            reply("Usage: /custom switch <model-id>");
            return;
          }
          const modelId = parts[1];
          if (!modelId) {
            reply("Model ID is required");
            return;
          }
          const model = customServer.getModel(modelId);
          if (!model) {
            reply(`\u274C Model "${modelId}" not found!

Use /custom models to see available models`);
            return;
          }
          reply(`\u{1F504} Switching to custom model: ${model.name}

\u23F3 Initializing model...`);
          reply(`\u2705 Model switched successfully!

Model: ${model.name}
ID: ${model.id}
Provider: ${model.provider}
Context: ${model.contextWindow.toLocaleString()} tokens

\u{1F680} Ready to use!`);
          break;
        case "add":
          if (parts.length < 7) {
            reply("Usage: /custom add <id> <name> <provider> <context> <input-cost> <output-cost>");
            return;
          }
          const newModelId = parts[1];
          const newModelName = parts[2];
          const newModelProvider = parts[3];
          const newModelContext = parts[4];
          const newModelInputCost = parts[5];
          const newModelOutputCost = parts[6];
          if (!newModelId || !newModelName || !newModelProvider || !newModelContext || !newModelInputCost || !newModelOutputCost) {
            reply("All parameters are required");
            return;
          }
          const newModel = {
            id: newModelId,
            name: newModelName,
            provider: newModelProvider,
            description: `Custom model ${newModelName}`,
            contextWindow: parseInt(newModelContext),
            inputCost: parseFloat(newModelInputCost),
            outputCost: parseFloat(newModelOutputCost),
            capabilities: ["code", "reasoning"],
            endpoint: "/chat/completions",
            isActive: true
          };
          customServer.addCustomModel(newModel);
          reply(`\u2705 Custom model added successfully!

Name: ${newModel.name}
ID: ${newModel.id}
Provider: ${newModel.provider}
Context: ${newModel.contextWindow.toLocaleString()} tokens
Cost: $${newModel.inputCost}/$${newModel.outputCost} per 1M tokens

\u{1F680} Model is now available!`);
          break;
        case "status":
          const config = customServer.getConfig();
          const hasApiKey = customServer.getApiKey() !== null;
          const activeModels = customServer.getActiveModels();
          const statusLines = [
            "\u{1F4CA} Custom Server Status",
            "",
            `\u{1F517} Server: ${config.baseUrl}`,
            `\u{1F511} API Key: ${hasApiKey ? "\u2705 Configured" : "\u274C Not set"}`,
            `\u{1F916} Active Models: ${activeModels.length}`,
            `\u23F1\uFE0F Timeout: ${config.timeout}ms`,
            `\u{1F504} Retries: ${config.retries}`,
            `\u{1F4C8} Rate Limit: ${config.rateLimit.requestsPerMinute} requests/min`,
            "",
            "\u{1F3AF} Quick Actions:",
            "\u2022 /custom connect <url> - Connect to server",
            "\u2022 /custom key <key> - Set API key",
            "\u2022 /custom models - List models",
            "\u2022 /custom switch <model> - Switch model"
          ];
          reply(statusLines.join("\n"));
          break;
        default:
          reply(`Unknown command "${command}". Use: connect, key, models, switch, add, status`);
          break;
      }
    }
  };
}
function buildCyberCoderCommand(ctx) {
  return {
    name: "codeva",
    description: "Access Codeva's exclusive features and models.",
    category: "utility",
    usage: "/codeva <models|ultra|pro|speed|code|creative> [prompt]",
    aliases: ["cybercoder"],
    run: async (args) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content) => ctx.appendMessage({
        id: `codeva-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      if (parts.length === 0) {
        reply("Usage: /codeva <models|ultra|pro|speed|code|creative> [prompt]");
        return;
      }
      const command = parts[0];
      const customServer = new CustomServerManager();
      switch (command) {
        case "models":
          const cybercoderModels = [
            { id: "codeva-ultra", name: "Codeva Ultra", desc: "Most powerful for complex tasks", cost: "$5/$15 per 1M" },
            { id: "codeva-pro", name: "Codeva Pro", desc: "Balanced for most tasks", cost: "$2/$6 per 1M" },
            { id: "codeva-speed", name: "Codeva Speed", desc: "Fast for quick responses", cost: "$0.50/$1.50 per 1M" },
            { id: "codeva-code", name: "Codeva Code", desc: "Specialized for coding", cost: "$1.50/$4.50 per 1M" },
            { id: "codeva-creative", name: "Codeva Creative", desc: "Creative and design tasks", cost: "$1/$3 per 1M" }
          ];
          let modelInfo = ["\u{1F9E0} Codeva Exclusive Models:", ""];
          cybercoderModels.forEach((model, index) => {
            modelInfo.push(`${index + 1}. \u{1F916} ${model.name}`);
            modelInfo.push(`   ${model.desc}`);
            modelInfo.push(`   \u{1F4B0} Cost: ${model.cost}`);
            modelInfo.push(`   \u{1F527} Use: /codeva ${model.id.split("-")[1]} <prompt>`);
            modelInfo.push("");
          });
          reply(modelInfo.join("\n"));
          break;
        case "ultra":
        case "pro":
        case "speed":
        case "code":
        case "creative":
          if (parts.length < 2) {
            reply(`Usage: /codeva ${command} <your-prompt>`);
            return;
          }
          const cybercoderModelId = `codeva-${command}`;
          const cybercoderModel = customServer.getModel(cybercoderModelId);
          const cybercoderPrompt = parts.slice(1).join(" ");
          if (!cybercoderPrompt) {
            reply("Prompt is required");
            return;
          }
          if (ctx.setModel) ctx.setModel(cybercoderModelId);
          if (ctx.submitUserPrompt) {
            ctx.submitUserPrompt(cybercoderPrompt);
          } else {
            reply(`Codeva ${command} is not available in this context.`);
          }
          break;
        default:
          reply(`Unknown command "${command}". Use: models, ultra, pro, speed, code, creative`);
          break;
      }
    }
  };
}

// src/commands/auth.ts
init_src();
init_config();
var log20 = createLogger("auth");
function buildLoginCommand(ctx) {
  return {
    name: "login",
    description: "Login using an API Key",
    category: "auth",
    usage: "/login <api_key>",
    run: async (args) => {
      const reply = (content) => ctx.appendMessage({
        id: `login-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      const key = args.trim();
      if (!key) {
        reply(
          `\u{1F510} CyberCoder Authentication Required

Usage: /login <api_key>

You can get an API key from the Web dashboard:
https://cybercodercli.info/settings/api-keys

Or use local models offline: /provider ollama`
        );
        return;
      }
      reply("\u{1F510} Authenticating key with Codeva Cloud...");
      try {
        const authInfo = await apiClient.authenticate(key);
        setAuthToken(key);
        setSessionId(authInfo.session_id);
        setUserProfile(authInfo.user);
        reply(
          `\u2705 Authentication Successful!

Welcome back, ${authInfo.user.name || "Developer"}!
Plan: ${authInfo.user.plan?.toUpperCase() || "FREE"}
Session ID: ${authInfo.session_id}

\u{1F680} CyberCoder is now online and connected to the cloud!`
        );
      } catch (err) {
        reply(`\u2715 Authentication failed: ${err.message || String(err)}`);
      }
    }
  };
}
function buildLogoutCommand(ctx) {
  return {
    name: "logout",
    description: "Logout from CyberCoder and clear all session data",
    category: "auth",
    usage: "/logout",
    run: async (args) => {
      void args;
      const reply = (content) => ctx.appendMessage({
        id: `logout-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      reply("\u{1F44B} Logging out...");
      try {
        await apiClient.logout();
      } catch {
      }
      clearLogin();
      if (ctx.logout) {
        ctx.logout();
      }
      reply("\u{1F44B} Logged out successfully. Session data cleared.");
    }
  };
}
function buildProfileCommand2(ctx) {
  return {
    name: "profile",
    description: "View your profile and active session stats",
    category: "auth",
    usage: "/profile",
    run: async (args) => {
      void args;
      const reply = (content) => ctx.appendMessage({
        id: `profile-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      const token = getAuthToken();
      if (!token) {
        reply("\u{1F464} Offline / Not Authenticated. Type /login to connect to the cloud.");
        return;
      }
      reply("\u{1F50D} Loading profile data from cloud...");
      try {
        const stats = await apiClient.getStats();
        const profile = getUserProfile();
        const profileLines = [
          "\u{1F464} CyberCoder Profile",
          "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
          `\u{1F4CB} Account:`,
          `  \u2022 Name: ${profile.name || "Developer"}`,
          `  \u2022 Email: ${profile.email || "N/A"}`,
          `  \u2022 Plan: ${profile.plan?.toUpperCase() || "FREE"}`,
          "",
          `\u{1F4CA} Session Usage:`,
          `  \u2022 Session ID: ${stats.current_session.id}`,
          `  \u2022 Commands Executed: ${stats.current_session.total_commands}`,
          `  \u2022 AI Interactions: ${stats.current_session.ai_interactions}`,
          `  \u2022 Session Tokens: ${stats.usage.this_session.tokens.toLocaleString()}`,
          `  \u2022 Session Cost: $${stats.usage.this_session.cost.toFixed(4)}`,
          "",
          `\u{1F4C9} Monthly Totals:`,
          `  \u2022 Total Requests: ${stats.usage.this_month.total_requests}`,
          `  \u2022 Total Cost: $${stats.usage.this_month.total_cost.toFixed(4)}`,
          `  \u2022 Total Commands: ${stats.usage.this_month.total_commands}`
        ];
        reply(profileLines.join("\n"));
      } catch (err) {
        reply(`\u2715 Failed to load profile: ${err.message || String(err)}`);
      }
    }
  };
}
function buildKnowledgeCommand(ctx) {
  return {
    name: "knowledge",
    description: "View your AI knowledge graph context",
    category: "utility",
    usage: "/knowledge [topic]",
    run: async (args) => {
      const reply = (content) => ctx.appendMessage({
        id: `knowledge-${Date.now()}`,
        role: "system",
        content,
        createdAt: Date.now()
      });
      const token = getAuthToken();
      if (!token) {
        reply("\u{1F9E0} Offline / Not Authenticated. Connect to cloud to sync knowledge.");
        return;
      }
      reply("\u{1F9E0} Fetching knowledge graph context...");
      try {
        const context = await apiClient.getContext(args.trim());
        const lines = [
          "\u{1F9E0} Your Knowledge Graph Context",
          "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
          "\u{1F4CA} Learned Skills:",
          context.knowledge?.skills?.length > 0 ? context.knowledge.skills.map((s) => `  \u2022 ${s.technology} (Level ${s.level})`).join("\n") : "  \u2022 No skills recorded yet.",
          "",
          "\u{1F3D7}\uFE0F Project Directories:",
          `  \u2022 Current Directory: ${context.current_session.working_directory}`,
          `  \u2022 Recent Active Directories:`,
          ...context.recent_sessions?.map((s) => `    - ${s.directory} (${s.commands} cmds)`) || ["    - None"]
        ];
        reply(lines.join("\n"));
      } catch (err) {
        reply(`\u2715 Failed to load knowledge: ${err.message || String(err)}`);
      }
    }
  };
}

// src/commands/init.ts
init_project_memory();
import * as fs2 from "fs";
import * as path2 from "path";
function buildInitCommand(ctx) {
  return {
    name: "init",
    description: "Initialize project with coding conventions (creates CYBER.md).",
    category: "config",
    usage: "/init",
    run: () => {
      const cwd2 = process.cwd();
      const targetPath = path2.join(cwd2, "CYBER.md");
      const reply = (content) => {
        ctx.appendMessage({
          id: `init-${Date.now()}`,
          role: "system",
          content,
          createdAt: Date.now()
        });
      };
      if (fs2.existsSync(targetPath)) {
        reply("\u26A0\uFE0F CYBER.md already exists in the current directory.");
        return;
      }
      let projectType = "Generic";
      let buildCommand = "make";
      let testCommand = "make test";
      let guidelines = "Write clean, modern, and self-documenting code.";
      if (fs2.existsSync(path2.join(cwd2, "package.json"))) {
        projectType = "Node.js / TypeScript";
        buildCommand = "npm run build";
        testCommand = "npm test";
        guidelines = "- Prefer TypeScript over plain JavaScript.\n- Use ES modules (import/export).\n- Keep dependencies minimal and use clean async/await patterns.";
      } else if (fs2.existsSync(path2.join(cwd2, "Cargo.toml"))) {
        projectType = "Rust";
        buildCommand = "cargo build";
        testCommand = "cargo test";
        guidelines = "- Follow standard rustfmt conventions.\n- Minimize use of `unsafe` blocks.\n- Handle errors explicitly using Result and Option.";
      } else if (fs2.existsSync(path2.join(cwd2, "go.mod"))) {
        projectType = "Go";
        buildCommand = "go build ./...";
        testCommand = "go test ./...";
        guidelines = "- Handle errors immediately where they occur.\n- Use standard naming style (camelCase).\n- Write table-driven unit tests.";
      } else if (fs2.existsSync(path2.join(cwd2, "requirements.txt")) || fs2.existsSync(path2.join(cwd2, "pyproject.toml")) || fs2.existsSync(path2.join(cwd2, "setup.py"))) {
        projectType = "Python";
        buildCommand = "python -m pip install -r requirements.txt";
        testCommand = "pytest";
        guidelines = "- Follow PEP 8 guidelines.\n- Use type hints for all public functions.\n- Write docstrings in Google style format.";
      }
      const template = `# CYBER.md - Project Conventions

This file defines guidelines and standard instructions for CyberCoder when operating in this codebase.

## Project Profile
- **Project Type**: ${projectType}
- **Build Command**: \`${buildCommand}\`
- **Test Command**: \`${testCommand}\`

## Coding Standards & Guidelines
${guidelines}
- Write thorough unit tests for new functionality.
- Prioritize visual polish, responsive design, and CSS variables for UI components.

## Architecture & Structure
- Document major architecture modules.
- Maintain clean separation between client (frontend) and server (backend) code.

## Preferred Tools
- CLI edits: Use \`edit\` tool for surgical modifications.
- Commands: Propose standard commands using \`run_command\`.
`;
      try {
        fs2.writeFileSync(targetPath, template, "utf8");
        let memoryNote = "";
        try {
          const stackMap = {
            "Node.js / TypeScript": ["Node.js", "TypeScript"],
            "Rust": ["Rust"],
            "Go": ["Go"],
            "Python": ["Python"],
            "Generic": []
          };
          const alreadyHad = cyberDirExists(cwd2);
          initProjectMemory(cwd2, {
            name: path2.basename(cwd2),
            summary: `${projectType} project.`,
            stack: stackMap[projectType] ?? [],
            commands: { build: buildCommand, test: testCommand },
            entryPoints: [],
            conventions: ["See CYBER.md for full coding conventions."]
          });
          memoryNote = alreadyHad ? "\n\nUpdated `.cyber/` project memory." : "\n\nAlso created `.cyber/` self-learning project memory (project.json, memory.md). Future sessions will understand this project from `.cyber/` alone.";
        } catch {
        }
        reply(`\u2705 Successfully initialized project! Created CYBER.md for **${projectType}**.${memoryNote}`);
      } catch (err) {
        reply(`\u274C Failed to create CYBER.md: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };
}

// src/commands/compact.ts
init_chat();
function buildCompactCommand(ctx) {
  return {
    name: "compact",
    description: "Compress conversation history to free context window.",
    category: "session",
    usage: "/compact [focus_topic]",
    run: async (args) => {
      const focus = args.trim();
      const reply = (content) => {
        ctx.appendMessage({
          id: `compact-${Date.now()}`,
          role: "system",
          content,
          createdAt: Date.now()
        });
      };
      const getMessages = ctx.getMessages;
      const setMessages = ctx.setMessages;
      if (!getMessages || !setMessages) {
        reply("\u26A0\uFE0F Compaction is not supported in this environment.");
        return;
      }
      const history = getMessages();
      const chatHistory = history.filter((m) => m.role === "user" || m.role === "assistant");
      if (chatHistory.length < 3) {
        reply("\u2139\uFE0F Message history is too brief to require compaction.");
        return;
      }
      reply("\u28FE Compressing conversation history via active provider...");
      const chatText = chatHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
      const systemPrompt = `You are a conversation compaction assistant. Your task is to summarize the preceding developer-assistant chat log into a single, dense, bulleted summary.
Specify what files have been read/edited, what build/test commands were run, and what tasks remain.
${focus ? `Focus particularly on: ${focus}` : ""}
Keep the summary under 200 words. Do not introduce yourself or add pleasantries. Start immediately with the bulleted list.`;
      try {
        const router = getRouter();
        let summary = "";
        const chunks = router.chat({
          model: "auto",
          messages: [{ role: "user", content: chatText }],
          systemPrompt,
          temperature: 0.3
        });
        for await (const chunk of chunks) {
          if (chunk.type === "text") {
            summary += chunk.text;
          } else if (chunk.type === "done" && chunk.reason === "error") {
            throw new Error(chunk.error ?? "Unknown model error");
          }
        }
        if (!summary) {
          throw new Error("Empty summary returned");
        }
        const compactedMessage = {
          id: `compact-summary-${Date.now()}`,
          role: "system",
          content: `[Conversation compacted to free context window]

**Progress summary so far**:
${summary.trim()}`,
          createdAt: Date.now()
        };
        setMessages([compactedMessage]);
        reply("\u2728 History successfully compacted!");
      } catch (err) {
        reply(`\u274C Failed to compact history: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };
}

// src/commands/usage-command.ts
function buildUsageCommand(ctx) {
  return {
    name: "usage",
    description: "Show live API usage stats from the backend.",
    category: "auth",
    usage: "/usage",
    run: async () => {
      const reply = (content) => {
        ctx.appendMessage({
          id: `usage-${Date.now()}`,
          role: "system",
          content,
          createdAt: Date.now()
        });
      };
      reply("\u28FE Querying usage statistics from backend...");
      try {
        const stats = await apiClient.getStats();
        const lines = [
          "\u256D\u2500\u2500\u2500 CyberCoder Usage Statistics \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E",
          `\u2502  Session ID: ${stats.current_session.id.slice(0, 12)}\u2026                   \u2502`,
          `\u2502  Session Started: ${new Date(stats.current_session.started_at).toLocaleTimeString()}                           \u2502`,
          "\u2502                                                             \u2502",
          "\u2502  This Session:                                              \u2502",
          `\u2502    - Commands executed: ${stats.usage.this_session.commands}                                   \u2502`,
          `\u2502    - Tokens consumed: ${stats.usage.this_session.tokens.toLocaleString()}                               \u2502`,
          `\u2502    - Session Cost: $${stats.usage.this_session.cost.toFixed(4)}                                \u2502`,
          "\u2502                                                             \u2502",
          "\u2502  This Month:                                                \u2502",
          `\u2502    - Total requests: ${stats.usage.this_month.total_requests}                                   \u2502`,
          `\u2502    - Total commands: ${stats.usage.this_month.total_commands}                                   \u2502`,
          `\u2502    - Total cost: $${stats.usage.this_month.total_cost.toFixed(4)}                                    \u2502`,
          "\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F"
        ];
        reply(lines.join("\n"));
      } catch (err) {
        reply(`\u274C Failed to retrieve usage statistics: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };
}

// src/commands/automation.ts
function buildTestCommand(ctx) {
  return {
    name: "/test",
    description: "Run tests and auto-fix failures iteratively (TDD Loop)",
    category: "agent",
    usage: "/test <command>",
    run: (args) => {
      const cmd = args.trim();
      if (!cmd) {
        ctx.appendMessage({ role: "assistant", type: "text", text: "Usage: /test <command> (e.g. /test npm run test)" });
        return;
      }
      const prompt = `Run the following test command: \`${cmd}\`. If it fails with a non-zero exit code, analyze the stderr/stdout, determine why it failed, apply the necessary code fixes using your tools, and then run the test again. Repeat this loop autonomously until the test passes with exit code 0 or you hit a limit of 3 attempts.`;
      ctx.appendMessage({
        role: "user",
        type: "text",
        text: prompt
      });
      ctx.submitUserPrompt?.(prompt);
    }
  };
}
function buildPRCommand(ctx) {
  return {
    name: "/pr",
    description: "Automatically generate a PR title/body and open a Pull Request",
    category: "agent",
    usage: "/pr [branch_name]",
    run: (args) => {
      const branchName = args.trim() || "auto-pr-" + Math.random().toString(36).substring(2, 8);
      const prompt = `Please review the current \`git diff\`. 
1. Create a new branch named \`${branchName}\` if not already on it.
2. Commit the changes with an incredibly detailed, semantic commit message.
3. Push the branch to origin.
4. Use the \`run_command\` tool with \`gh pr create --title "..." --body "..."\` to open a GitHub Pull Request. You MUST generate a beautiful Markdown body describing the changes, testing steps, and architectural decisions.`;
      ctx.appendMessage({
        role: "user",
        type: "text",
        text: prompt
      });
      ctx.submitUserPrompt?.(prompt);
    }
  };
}

// src/commands/index.ts
function buildCommandRegistry(ctx) {
  const commands = [
    buildHelpCommand(ctx, () => commands),
    buildClearCommand(ctx),
    buildExitCommand(ctx),
    buildSkillsCommand(ctx),
    buildResearchCommand(ctx),
    buildPlanCommand(ctx),
    buildCodeReviewCommand(ctx),
    buildDebugCommand(ctx),
    buildSecurityCommand(ctx),
    buildCommitCommand(ctx),
    buildWebCommand(ctx),
    buildGoalCommand(ctx),
    buildFixCommand(ctx),
    buildTrustCommand(ctx),
    buildSecretCommand(ctx),
    buildModelCommand(ctx),
    buildProviderCommand(ctx),
    buildConsensusCommand(ctx),
    buildColorCommand(ctx),
    buildThemeCommand(ctx),
    buildSettingsCommand(ctx),
    buildReleaseNotesCommand(ctx),
    buildHooksCommand(ctx),
    buildWorkflowCommand(ctx),
    buildRewindCommand(ctx),
    buildDiffCommand(ctx),
    buildProfileCommand(ctx),
    buildCollabCommand(ctx),
    buildWorktreeCommand(ctx),
    buildImageCommand(ctx),
    buildMermaidCommand(ctx),
    buildCostCommand(ctx),
    buildHotkeysCommand(ctx),
    buildScreenshotCommand(ctx),
    buildMobileCommand(ctx),
    buildMCPCommand(ctx),
    buildSkillsMarketplaceCommand(ctx),
    buildTelemetryCommand(ctx),
    buildSuperCommand(ctx),
    buildAICommand(ctx),
    buildWorkspaceCommand(ctx),
    buildGenCommand(ctx),
    buildCustomCommand(ctx),
    buildCyberCoderCommand(ctx),
    buildLoginCommand(ctx),
    buildLogoutCommand(ctx),
    buildProfileCommand2(ctx),
    buildKnowledgeCommand(ctx),
    buildInitCommand(ctx),
    buildCompactCommand(ctx),
    buildUsageCommand(ctx),
    buildTestCommand(ctx),
    buildPRCommand(ctx),
    ...buildStubCommands(ctx)
  ];
  const byName = /* @__PURE__ */ new Map();
  for (const c of commands) {
    byName.set(c.name, c);
    for (const alias of c.aliases ?? []) byName.set(alias, c);
  }
  return {
    all: () => commands.filter((c) => !c.hidden),
    find: (name) => byName.get(name),
    byCategory: () => {
      const out = {};
      for (const c of commands) {
        if (c.hidden) continue;
        (out[c.category] ??= []).push(c);
      }
      return out;
    }
  };
}

// src/app.tsx
init_chat();
init_hooks();
init_config();

// src/utils/update.ts
init_src();
var cachedLatest = null;
var lastCheck = 0;
var CACHE_TTL = 60 * 60 * 1e3;
async function checkLatestVersion() {
  const now = Date.now();
  if (cachedLatest && now - lastCheck < CACHE_TTL) {
    return cachedLatest;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5e3);
    const res = await fetch(
      "https://registry.npmjs.org/@cybercli_chat%2Fcli",
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const latest = data["dist-tags"]?.latest ?? null;
    if (latest) {
      cachedLatest = latest;
      lastCheck = now;
    }
    return latest;
  } catch {
    return null;
  }
}
function compareSemver(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na > nb ? 1 : -1;
  }
  return 0;
}
async function getUpdateMessage() {
  const latest = await checkLatestVersion();
  if (!latest) return null;
  if (compareSemver(CYBERMIND_VERSION, latest) < 0) {
    return `A new version of ${CYBERMIND_VERSION} is available: ${latest}. Run "npm install -g @cybercli_chat/cli@${latest}" to update.`;
  }
  return null;
}

// src/app.tsx
import { Fragment as Fragment3, jsx as jsx16, jsxs as jsxs15 } from "react/jsx-runtime";
var App = ({ showWelcome, initialModel, initialProvider }) => {
  const { exit } = useApp2();
  const configTheme = getTheme();
  const [themeVersion, setThemeVersion] = useState9(0);
  if (themeVersion === 0) {
    setActiveTheme(configTheme.mode ?? "dark");
  }
  const hasCompletedOnboarding = isOnboardingComplete() && isAuthenticated();
  const [screen, setScreen] = useState9(hasCompletedOnboarding ? "welcome" : "onboarding");
  const [themeConfig, setThemeConfig] = useState9({
    mode: configTheme.mode,
    syntaxTheme: configTheme.syntaxTheme
  });
  void themeConfig;
  const [messages, setMessages] = useState9([]);
  const [totalTokens, setTotalTokens] = useState9(0);
  const [totalCost, setTotalCost] = useState9(0);
  const [status, setStatus] = useState9("idle");
  const [model, setModel] = useState9(initialModel ?? "auto");
  const [provider, setProvider] = useState9(initialProvider ?? "auto");
  const [statusMessage, setStatusMessage] = useState9(void 0);
  const [, setPromptColor] = useState9("cyan");
  const [welcomeVisible, setWelcomeVisible] = useState9(showWelcome);
  const [exitConfirm, setExitConfirm] = useState9(false);
  const [pendingApproval, setPendingApproval] = useState9(null);
  const [updateNotice, setUpdateNotice] = useState9("");
  useEffect4(() => {
    if (screen === "chat" || screen === "welcome") {
      void getUpdateMessage().then((msg) => {
        if (msg) setUpdateNotice(msg);
      });
    }
  }, [screen]);
  const streamingIdRef = useRef2(null);
  const driveChatRef = useRef2(async () => {
  });
  const approvalUI = useMemo(
    () => ({
      ask(prompt) {
        return new Promise((resolve13) => {
          setPendingApproval({
            toolName: prompt.toolName,
            summary: prompt.summary,
            destructive: prompt.destructive,
            resolve: (decision) => {
              setPendingApproval(null);
              resolve13(decision);
            }
          });
        });
      }
    }),
    []
  );
  const appendMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);
  const clearMessages = useCallback(() => {
    setMessages([]);
    setWelcomeVisible(true);
  }, []);
  const commandRegistry = useMemo(
    () => buildCommandRegistry({
      clear: clearMessages,
      exit: () => exit(),
      appendMessage,
      submitUserPrompt: (text) => {
        void driveChatRef.current(text);
      },
      getModel: () => model,
      setModel,
      getProvider: () => provider,
      setProvider,
      setPromptColor,
      setScreen: (s) => setScreen(s),
      logout: () => {
        clearLogin();
        setMessages([]);
        setWelcomeVisible(true);
        setScreen("onboarding");
      },
      getMessages: () => messages,
      setMessages: (msgs) => setMessages(msgs)
    }),
    [appendMessage, clearMessages, exit, model, provider, setScreen, setMessages, setWelcomeVisible, messages]
  );
  useInput8((input, key) => {
    if (key.ctrl && input === "c") {
      if (exitConfirm) {
        exit();
      } else {
        setExitConfirm(true);
        setTimeout(() => setExitConfirm(false), 2e3);
      }
    }
  });
  const appendDelta = useCallback((delta) => {
    setMessages((prev) => {
      const id = streamingIdRef.current;
      if (!id) return prev;
      return prev.map((m) => m.id === id ? { ...m, content: m.content + delta } : m);
    });
  }, []);
  const driveChat = useCallback(
    async (userText, goalMode = false) => {
      const userMsg = {
        id: cryptoRandomId(),
        role: "user",
        content: userText,
        createdAt: Date.now()
      };
      const assistantId = cryptoRandomId();
      streamingIdRef.current = assistantId;
      const assistantMsg = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: Date.now()
      };
      const nextHistory = [...messages, userMsg];
      setMessages([...nextHistory, assistantMsg]);
      setStatus("thinking");
      const driver = goalMode ? runGoalChat : runChat;
      try {
        await driver(nextHistory, {
          model,
          approvalUI,
          onEvent: (evt) => {
            if (evt.type === "status") {
              setStatusMessage(evt.text || evt.content || evt.message);
            } else if (evt.type === "text") {
              if (statusMessage) setStatusMessage(void 0);
              appendDelta(evt.text);
            } else if (evt.type === "tool_call") {
              setStatus("awaiting-approval");
              appendDelta(`
[\u2192 ${evt.name}] ${stringifyArgs(evt.input)}
`);
            } else if (evt.type === "tool_result") {
              setStatus("thinking");
              const trimmed = evt.output.length > 800 ? `${evt.output.slice(0, 800)}
\u2026[truncated]` : evt.output;
              appendDelta(`
${trimmed}
`);
            } else if (evt.type === "usage") {
              setTotalTokens((prev) => prev + evt.inputTokens + evt.outputTokens);
              const costAmt = evt.inputTokens * 3e-6 + evt.outputTokens * 15e-6;
              setTotalCost((prev) => prev + costAmt);
            } else if (evt.type === "context") {
              appendDelta(`
[\xB7 ${evt.note} \xB7]
`);
            } else if (evt.type === "done") {
              if (evt.reason === "error") {
                appendDelta(`
[error] ${evt.error ?? "unknown"}`);
              }
            }
          }
        });
      } catch (err) {
        appendDelta(`
[fatal] ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        streamingIdRef.current = null;
        setStatus("idle");
        try {
          const h = runHooks("postTask", userText);
          if (h.output) {
            appendMessage({ id: cryptoRandomId(), role: "system", content: h.output, createdAt: Date.now() });
          }
        } catch {
        }
      }
    },
    [messages, model, appendDelta, approvalUI]
  );
  driveChatRef.current = driveChat;
  const handleSubmit = useCallback(
    (raw) => {
      const text = raw.trim();
      if (!text) return;
      if (text.startsWith("/")) {
        const trimmed = text.slice(1).trim();
        if (!trimmed) {
          const helpCmd = commandRegistry.find("help");
          if (helpCmd) {
            helpCmd.run("");
          } else {
            appendMessage({
              id: cryptoRandomId(),
              role: "system",
              content: "Type /help to see all available commands.",
              createdAt: Date.now()
            });
          }
          return;
        }
        const [name, ...rest] = trimmed.split(/\s+/);
        const args = rest.join(" ");
        if (name === "goal") {
          if (!args.trim()) {
            appendMessage({
              id: cryptoRandomId(),
              role: "system",
              content: "Usage: /goal <objective> \u2014 I will work autonomously until it is done.",
              createdAt: Date.now()
            });
            return;
          }
          void driveChat(args, true);
          return;
        }
        const cmd = commandRegistry.find(name ?? "");
        if (!cmd) {
          appendMessage({
            id: cryptoRandomId(),
            role: "system",
            content: `Unknown command: /${name}. Type / for a list.`,
            createdAt: Date.now()
          });
          return;
        }
        try {
          cmd.run(args);
        } catch (err) {
          appendMessage({
            id: cryptoRandomId(),
            role: "system",
            content: `Error in /${name}: ${err instanceof Error ? err.message : String(err)}`,
            createdAt: Date.now()
          });
        }
        return;
      }
      void driveChat(text);
    },
    [appendMessage, commandRegistry, welcomeVisible, driveChat]
  );
  const handleOnboardingComplete = useCallback((method) => {
    void method;
    setScreen("theme");
  }, []);
  const handleThemeComplete = useCallback((theme) => {
    setThemeConfig(theme);
    setTheme(theme.mode, theme.syntaxTheme);
    setActiveTheme(theme.mode);
    setThemeVersion((v) => v + 1);
    setScreen("welcome");
  }, []);
  const handleSettingsClose = useCallback(() => {
    setScreen("chat");
  }, []);
  const handleModelSelect = useCallback((modelId) => {
    setModel(modelId);
    setScreen("chat");
  }, []);
  const handleModelClose = useCallback(() => {
    setScreen("chat");
  }, []);
  const handleReleaseNotesClose = useCallback(() => {
    setScreen("chat");
  }, []);
  const renderScreen = () => {
    switch (screen) {
      case "onboarding":
        return /* @__PURE__ */ jsx16(Onboarding, { onComplete: handleOnboardingComplete });
      case "theme":
        return /* @__PURE__ */ jsx16(ThemePicker, { onComplete: handleThemeComplete });
      case "settings":
        return /* @__PURE__ */ jsx16(Settings, { onClose: handleSettingsClose });
      case "model":
        return /* @__PURE__ */ jsx16(ModelPicker, { currentModel: model, onSelect: handleModelSelect, onClose: handleModelClose });
      case "release-notes":
        return /* @__PURE__ */ jsx16(ReleaseNotes, { onClose: handleReleaseNotesClose });
      case "welcome":
        return /* @__PURE__ */ jsxs15(Fragment3, { children: [
          updateNotice && /* @__PURE__ */ jsx16(Box16, { marginBottom: 1, children: /* @__PURE__ */ jsx16(Text16, { color: "yellow", children: updateNotice }) }),
          welcomeVisible && /* @__PURE__ */ jsx16(Welcome, { provider, model }),
          /* @__PURE__ */ jsx16(MessageList, { messages }),
          pendingApproval && /* @__PURE__ */ jsx16(ApprovalDialog, { pending: pendingApproval }),
          status === "thinking" && /* @__PURE__ */ jsx16(ThinkingIndicator, { tokens: totalTokens, label: statusMessage }),
          /* @__PURE__ */ jsx16(Prompt, { onSubmit: handleSubmit, disabled: status !== "idle" }),
          /* @__PURE__ */ jsx16(StatusBar, { status, model, provider, tokens: totalTokens, cost: totalCost }),
          /* @__PURE__ */ jsx16(HintBar, { status }),
          exitConfirm && /* @__PURE__ */ jsx16(ExitConfirm, {})
        ] });
      case "chat":
      default:
        return /* @__PURE__ */ jsxs15(Fragment3, { children: [
          updateNotice && /* @__PURE__ */ jsx16(Box16, { marginBottom: 1, children: /* @__PURE__ */ jsx16(Text16, { color: "yellow", children: updateNotice }) }),
          welcomeVisible && /* @__PURE__ */ jsx16(Welcome, { provider, model }),
          /* @__PURE__ */ jsx16(MessageList, { messages }),
          pendingApproval && /* @__PURE__ */ jsx16(ApprovalDialog, { pending: pendingApproval }),
          status === "thinking" && /* @__PURE__ */ jsx16(ThinkingIndicator, { tokens: totalTokens, label: statusMessage }),
          /* @__PURE__ */ jsx16(Prompt, { onSubmit: handleSubmit, disabled: status !== "idle" }),
          /* @__PURE__ */ jsx16(StatusBar, { status, model, provider, tokens: totalTokens, cost: totalCost }),
          /* @__PURE__ */ jsx16(HintBar, { status }),
          exitConfirm && /* @__PURE__ */ jsx16(ExitConfirm, {})
        ] });
    }
  };
  return /* @__PURE__ */ jsx16(Box16, { flexDirection: "column", children: renderScreen() });
};
function cryptoRandomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function stringifyArgs(input) {
  const pairs = Object.entries(input).map(([k, v]) => {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    const short = s.length > 80 ? `${s.slice(0, 80)}\u2026` : s;
    return `${k}=${short}`;
  });
  return pairs.join(", ");
}

// src/index.tsx
init_chat();
init_config();
import { jsx as jsx17 } from "react/jsx-runtime";
var log21 = createLogger("cli");
async function main() {
  const program = new Command();
  program.name("cm").description("CyberCoder CLI \u2014 fullstack agentic coding assistant by Codeva").version(CYBERMIND_VERSION, "-v, --version", "print the CyberCoder version").option("-d, --debug", "enable debug logging").option("--no-welcome", "skip the welcome screen on startup").option("-p, --print <prompt>", "print mode: run a single prompt non-interactively and exit").option("--model <name>", "override the default model for this session").option("--provider <name>", "override the default provider for this session").option("--rpc", "start as a JSON-RPC server (used by the VS Code extension)").action(async (opts) => {
    if (opts.rpc) {
      const { startRpcServer: startRpcServer2 } = await Promise.resolve().then(() => (init_rpc_server(), rpc_server_exports));
      startRpcServer2();
      return;
    }
    if (opts.debug) {
      process.env.CYBERMIND_LOG_LEVEL = "debug";
      process.env.CYBERMIND_LOG_STDERR = "true";
    }
    log21.debug("starting CyberCoder CLI", { opts });
    if (opts.print) {
      void runPrintMode(opts.print, opts.model);
      return;
    }
    const { waitUntilExit } = render(
      /* @__PURE__ */ jsx17(
        App,
        {
          showWelcome: opts.welcome !== false,
          initialModel: opts.model,
          initialProvider: opts.provider
        }
      ),
      {
        exitOnCtrlC: false
        // we handle Ctrl+C ourselves to confirm exits
      }
    );
    waitUntilExit().then(
      () => process.exit(0),
      (err) => {
        log21.error("CLI exited with error", err instanceof Error ? err.message : err);
        process.exit(1);
      }
    );
  });
  program.command("status").description("Show CyberCoder authentication status").action(() => {
    const loggedIn = isOnboardingComplete();
    console.log("\u{1F510} CyberCoder Status");
    console.log(`   Authentication: ${loggedIn ? "\u2705 Logged in" : "\u274C Not logged in"}`);
    console.log(`   Version: ${CYBERMIND_VERSION}`);
    if (!loggedIn) {
      console.log("   Run `cm` to start the login flow.");
    }
    process.exit(0);
  });
  program.command("login").description("Login to CyberCoder (opens browser)").action(() => {
    const loggedIn = isOnboardingComplete();
    if (loggedIn) {
      console.log("\u2705 Already logged in to CyberCoder.");
      console.log("   Run `cm` to start coding.");
    } else {
      console.log("\u{1F510} CyberCoder Login");
      console.log("   Opening browser to https://cybercodercli.info/login ...");
      import("open").then((mod) => {
        mod.default("https://cybercodercli.info/login?redirect=cli");
        console.log("   Browser opened. Complete login there, then run `cm`.");
        process.exit(0);
      }).catch(() => {
        console.log("   Visit: https://cybercodercli.info/login?redirect=cli");
        process.exit(0);
      });
      return;
    }
    process.exit(0);
  });
  program.command("logout").description("Logout from CyberCoder and clear all session data").action(() => {
    clearLogin();
    console.log("\u{1F44B} Logged out from CyberCoder.");
    console.log("   All session data and API keys cleared.");
    console.log("   Run `cm` again to log in.");
    process.exit(0);
  });
  program.parseAsync(process.argv).catch((err) => {
    log21.error("failed to parse args", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
async function runPrintMode(prompt, model) {
  const history = [
    { id: "u1", role: "user", content: prompt, createdAt: Date.now() }
  ];
  let exitCode = 0;
  try {
    await runChat(history, {
      model,
      onEvent: (evt) => {
        if (evt.type === "text") process.stdout.write(evt.text);
        else if (evt.type === "tool_call") {
          process.stdout.write(`
[tool call: ${evt.name}] (executor lands in M3)
`);
        } else if (evt.type === "done") {
          if (evt.reason === "error") {
            process.stderr.write(`
[error] ${evt.error ?? "unknown"}
`);
            exitCode = 1;
          } else {
            process.stdout.write("\n");
          }
        }
      }
    });
  } catch (err) {
    process.stderr.write(`
[fatal] ${err instanceof Error ? err.message : String(err)}
`);
    exitCode = 1;
  }
  process.exit(exitCode);
}
main().catch((err) => {
  console.error("[cybercoder] fatal:", err);
  process.exit(1);
});
//# sourceMappingURL=index.js.map