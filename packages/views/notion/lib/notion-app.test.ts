import { describe, it, expect } from "vitest";
import {
  extractNotionPageId,
  filterNotionPages,
  isEmbeddableNotionUrl,
  notionEmbedSrc,
  notionHubHref,
  notionPageUrl,
} from "./notion-app";

describe("extractNotionPageId", () => {
  it("parses bare 32-hex", () => {
    expect(extractNotionPageId("407f5b5cf6c483d5980881dde05fce38")).toBe(
      "407f5b5cf6c483d5980881dde05fce38",
    );
  });

  it("parses app.notion.com/p/ links", () => {
    expect(
      extractNotionPageId(
        "https://app.notion.com/p/407f5b5cf6c483d5980881dde05fce38?pvs=204",
      ),
    ).toBe("407f5b5cf6c483d5980881dde05fce38");
  });

  it("parses notion.so title-slug URLs", () => {
    expect(
      extractNotionPageId(
        "https://www.notion.so/My-Doc-407f5b5cf6c483d5980881dde05fce38",
      ),
    ).toBe("407f5b5cf6c483d5980881dde05fce38");
  });
});

describe("notionPageUrl / notionHubHref", () => {
  it("builds a notion.so open URL from an id", () => {
    expect(notionPageUrl("407f5b5cf6c483d5980881dde05fce38")).toBe(
      "https://www.notion.so/407f5b5cf6c483d5980881dde05fce38",
    );
  });

  it("appends page query on the hub path", () => {
    expect(notionHubHref("/acme/notion", "abc")).toBe("/acme/notion?page=abc");
  });
});

describe("filterNotionPages", () => {
  const pages = [
    {
      id: "a".repeat(32),
      title: "SDK docs",
      url: "https://www.notion.so/" + "a".repeat(32),
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "b".repeat(32),
      title: "Roadmap",
      url: "https://www.notion.so/" + "b".repeat(32),
      updatedAt: "2026-01-02T00:00:00Z",
    },
  ];

  it("filters by title case-insensitively", () => {
    expect(filterNotionPages(pages, "sdk")).toHaveLength(1);
    expect(filterNotionPages(pages, "sdk")[0]?.title).toBe("SDK docs");
  });
});

describe("isEmbeddableNotionUrl / notionEmbedSrc", () => {
  it("rejects main Notion app hosts (cause refused to connect in iframe)", () => {
    expect(isEmbeddableNotionUrl("https://www.notion.com")).toBe(false);
    expect(isEmbeddableNotionUrl("https://www.notion.so")).toBe(false);
    expect(
      isEmbeddableNotionUrl(
        "https://www.notion.so/My-Doc-407f5b5cf6c483d5980881dde05fce38",
      ),
    ).toBe(false);
    expect(
      isEmbeddableNotionUrl(
        "https://app.notion.com/p/407f5b5cf6c483d5980881dde05fce38",
      ),
    ).toBe(false);
  });

  it("allows public notion.site shares", () => {
    expect(
      isEmbeddableNotionUrl("https://acme.notion.site/Doc-407f5b5cf6c483d5980881dde05fce38"),
    ).toBe(true);
  });

  it("returns null embed src for default home / app page ids", () => {
    expect(notionEmbedSrc(null)).toBeNull();
    expect(notionEmbedSrc("407f5b5cf6c483d5980881dde05fce38")).toBeNull();
  });

  it("returns embeddable src for notion.site with embed=true", () => {
    const src = notionEmbedSrc(
      "https://acme.notion.site/Doc-407f5b5cf6c483d5980881dde05fce38",
    );
    expect(src).toContain("acme.notion.site");
    expect(src).toContain("embed=true");
  });
});
