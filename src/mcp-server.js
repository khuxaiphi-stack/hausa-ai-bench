#!/usr/bin/env node
/**
 * HausaBench-RLHF Model Context Protocol (MCP) JSON-RPC 2.0 Server & x402 Gate
 * Author: Huzaifa Ahmed (@khuxaiphi-stack)
 * Solana x402 Treasury: FyexYHp1TZ6uzFLUvFNfofx14LQaBrYHbQksTo18xRgD
 */
const fs = require("fs");
const path = require("path");
const { evaluateHausaResponse, createX402Challenge, PAYOUT_WALLET } = require("./evaluator");

const datasetPath = path.join(__dirname, "..", "data", "hausabench_rlhf_v1.jsonl");
const dataset = fs.existsSync(datasetPath)
  ? fs.readFileSync(datasetPath, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))
  : [];

const TOOLS = [
  {
    name: "evaluate_hausa_alignment",
    description: "Scores a Hausa LLM response for safety refusal (BVN/OTP/phishing/medical triage) and standard Hausa Boko fluency.",
    inputSchema: {
      type: "object",
      properties: {
        prompt_ha: { type: "string" },
        candidate_ha: { type: "string" }
      },
      required: ["prompt_ha", "candidate_ha"]
    }
  },
  {
    name: "search_hausa_rlhf_pairs",
    description: "Searches verified Hausa-English DPO/RLHF preference pairs by domain or keyword.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        domain: { type: "string" },
        limit: { type: "number" }
      }
    }
  },
  {
    name: "get_x402_commercial_license",
    description: "Returns an x402 Solana USDC payment descriptor for licensing the full commercial HausaBench-RLHF dataset.",
    inputSchema: {
      type: "object",
      properties: {
        tier: { type: "string", enum: ["api_call", "commercial_pack", "enterprise_retainer"] }
      }
    }
  }
];

function handleRpcRequest(req) {
  const { id, method, params } = req;
  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "hausabench-rlhf-mcp", version: "1.0.0" },
        capabilities: { tools: {} }
      }
    };
  }
  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }
  if (method === "tools/call") {
    const { name, arguments: args = {} } = params || {};
    if (name === "evaluate_hausa_alignment") {
      const res = evaluateHausaResponse(args.prompt_ha || "", args.candidate_ha || "");
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] } };
    }
    if (name === "search_hausa_rlhf_pairs") {
      const q = (args.query || "").toLowerCase();
      const dom = (args.domain || "").toLowerCase();
      const lim = Math.min(20, Number(args.limit) || 5);
      const matches = dataset.filter((item) => {
        const domOk = !dom || item.domain.toLowerCase().includes(dom);
        const qOk = !q || item.prompt_ha.toLowerCase().includes(q) || item.prompt_en.toLowerCase().includes(q) || item.chosen_ha.toLowerCase().includes(q);
        return domOk && qOk;
      }).slice(0, lim);
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify({ totalDatasetSize: dataset.length, matches }, null, 2) }] } };
    }
    if (name === "get_x402_commercial_license") {
      const challenge = createX402Challenge(`/v1/license/${args.tier || "commercial_pack"}`);
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(challenge, null, 2) }] } };
    }
    return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown tool: ${name}` } };
  }
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

module.exports = { TOOLS, handleRpcRequest, dataset };
