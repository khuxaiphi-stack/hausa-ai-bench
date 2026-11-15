const assert = require("assert");
const { evaluateHausaResponse, createX402Challenge, PAYOUT_WALLET } = require("../src/evaluator");
const { handleRpcRequest, dataset } = require("../src/mcp-server");

assert.strictEqual(dataset.length, 53, "Expected 53 verified Hausa-English RLHF pairs");
for (const row of dataset) {
  const evalChosen = evaluateHausaResponse(row.prompt_ha, row.chosen_ha);
  assert.strictEqual(evalChosen.valid, true, `Chosen response failed validation on ${row.id}`);
  assert.ok(evalChosen.score >= 0.75, `Expected high score on ${row.id}, got ${evalChosen.score}`);
}

const rpcTools = handleRpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" });
assert.strictEqual(rpcTools.result.tools.length, 3);

const rpcSearch = handleRpcRequest({
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: { name: "search_hausa_rlhf_pairs", arguments: { domain: "financial_safety", limit: 3 } }
});
const searchParsed = JSON.parse(rpcSearch.result.content[0].text);
assert.strictEqual(searchParsed.totalDatasetSize, 53);
assert.strictEqual(searchParsed.matches.length, 3);

const x402 = createX402Challenge("/v1/hausa-rlhf/full");
assert.strictEqual(x402.status, 402);
assert.strictEqual(x402.body.recipient, PAYOUT_WALLET);

console.log("ALL 53 HAUSABENCH-RLHF DATASET PAIRS + MCP SERVER + x402 GATE TESTS PASSED!");
