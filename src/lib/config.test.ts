import { describe, expect, it } from "vitest";

import { ConfigError, loadConfig } from "./config";

const liveEnv = {
  NODE_ENV: "production",
  SOR_PROVIDER: "tnt-mcp",
  TNT_MCP_URL: "https://tnt.example.test/mcp",
  TNT_MCP_API_KEY: "tnt_example_key",
  TNT_ORGANIZATION_ID: "1",
  TNT_GIT_REPOSITORY_ID: "2",
  TNT_REPO_SLUG: "Example/repo",
  TNT_WEB_BASE_URL: "https://tnt.example.test",
  OPS_CONSOLE_ACCESS_TOKEN: "a-long-enough-operator-token-123",
  OPS_CONSOLE_SESSION_SECRET: "0123456789abcdef0123456789abcdef",
};

describe("loadConfig", () => {
  it("parses a complete live configuration", () => {
    const config = loadConfig(liveEnv);

    expect(config.provider).toBe("tnt-mcp");
    expect(config.tnt).toMatchObject({
      mcpUrl: "https://tnt.example.test/mcp",
      organizationId: 1,
      gitRepositoryId: 2,
      repoSlug: "Example/repo",
      webBaseUrl: "https://tnt.example.test",
    });
    expect(config.tnt?.apiKey).toBe("tnt_example_key");
    expect(config.access.mode).toBe("token");
  });

  it("defaults to fixtures with anonymous access outside production", () => {
    const config = loadConfig({ NODE_ENV: "development" });

    expect(config.provider).toBe("fixtures");
    expect(config.access.mode).toBe("anonymous");
    expect(config.tnt).toBeNull();
  });

  it("fails closed in production when no access token is configured", () => {
    const { OPS_CONSOLE_ACCESS_TOKEN: _token, ...env } = liveEnv;
    expect(() => loadConfig(env)).toThrowError(ConfigError);
    expect(() => loadConfig(env)).toThrowError(/OPS_CONSOLE_ACCESS_TOKEN/);
  });

  it("allows anonymous access in production only when explicitly opted in", () => {
    const { OPS_CONSOLE_ACCESS_TOKEN: _token, OPS_CONSOLE_SESSION_SECRET: _secret, ...env } = liveEnv;
    const config = loadConfig({ ...env, OPS_CONSOLE_ALLOW_ANONYMOUS: "true" });
    expect(config.access.mode).toBe("anonymous");
  });

  it("requires the TNT API key when the provider is tnt-mcp", () => {
    const { TNT_MCP_API_KEY: _key, ...env } = liveEnv;
    expect(() => loadConfig(env)).toThrowError(/TNT_MCP_API_KEY/);
  });

  it("refuses a non-https MCP URL unless it is loopback", () => {
    expect(() => loadConfig({ ...liveEnv, TNT_MCP_URL: "http://tnt.example.test/mcp" })).toThrowError(
      /https/,
    );
    expect(loadConfig({ ...liveEnv, TNT_MCP_URL: "http://127.0.0.1:9850/mcp" }).tnt?.mcpUrl).toBe(
      "http://127.0.0.1:9850/mcp",
    );
  });

  it("rejects short access tokens and session secrets", () => {
    expect(() => loadConfig({ ...liveEnv, OPS_CONSOLE_ACCESS_TOKEN: "short" })).toThrowError(
      /OPS_CONSOLE_ACCESS_TOKEN/,
    );
    expect(() => loadConfig({ ...liveEnv, OPS_CONSOLE_SESSION_SECRET: "short" })).toThrowError(
      /OPS_CONSOLE_SESSION_SECRET/,
    );
  });

  it("derives a session secret outside production when one is not provided", () => {
    const { OPS_CONSOLE_SESSION_SECRET: _secret, ...env } = liveEnv;
    const config = loadConfig({ ...env, NODE_ENV: "development" });
    expect(config.access.mode).toBe("token");
    if (config.access.mode === "token") {
      expect(config.access.sessionSecret.length).toBeGreaterThanOrEqual(32);
    }
  });

  it("requires an explicit session secret in production", () => {
    const { OPS_CONSOLE_SESSION_SECRET: _secret, ...env } = liveEnv;
    expect(() => loadConfig(env)).toThrowError(/OPS_CONSOLE_SESSION_SECRET/);
  });
});
