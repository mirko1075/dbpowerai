export type AnalysisShape = {
  severity?: string | null;
  score?: number | null;
  issues?: string[] | null;
  suggestedIndex?: string | string[] | null;
  suggestedIndexes?: string | string[] | null;
  semantic_warning?: string | null;
  notes?: string | null;
  note?: string | null;
  rewrittenQuery?: string | null;
  optimized_query?: string | null;
  speedupEstimate?: number | null;
  validator_status?: string | null;
};

export async function sendSlackMessage(webhookUrl: string, body: Record<string, unknown>, analysis: AnalysisShape) {
  console.log("[STEP SLACK] Sending Slack notification...");
  const severityColor: Record<string, string> = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#ef4444",
    critical: "#dc2626"
  };

  // Normalize analysis fields with safe defaults
  const severity = String(analysis?.severity || 'low').toLowerCase();
  const score = analysis?.score ?? 'N/A';
  const issuesList = (Array.isArray(analysis?.issues) && analysis!.issues!.length) ? (analysis!.issues!.map((i: unknown) => `• ${String(i)}`).join('\n')) : 'None detected';
  const suggestedIndexes = analysis?.suggestedIndex || analysis?.suggestedIndexes || null;
  const notes = analysis?.semantic_warning || analysis?.notes || analysis?.note || 'No notes provided';
  const optimized = analysis?.rewrittenQuery || analysis?.optimized_query || null;
  const speedupPct = Math.round(((analysis?.speedupEstimate ?? 0) * 100));

  // extract display fields from body
  const sql = String(body['sql'] || '');
  const tableSchema = body['database_schema'] ? String(body['database_schema']) : (body['schema'] ? String(body['schema']) : null);
  const executionPlan = body['explain_plan'] ? String(body['explain_plan']) : (body['explain'] ? String(body['explain']) : null);

  const blocks: unknown[] = [
    { type: "header", text: { type: "plain_text", text: "🔍 SQL Query Analyzed via Webhook API" } },
    { type: "section", fields: [ { type: "mrkdwn", text: `*Severity:* ${severity.toUpperCase()}` }, { type: "mrkdwn", text: `*Score:* ${score}/100` } ] },
    { type: "section", text: { type: "mrkdwn", text: `*Original Query:*\n\`\`\`${sql}\`\`\`` } },
    { type: "section", text: { type: "mrkdwn", text: `*Optimized Query:*\n\`\`\`${optimized || 'No rewrite available'}\`\`\`` } },
    { type: "section", text: { type: "mrkdwn", text: `*Suggested Indexes:*\n${suggestedIndexes ? '```' + String(suggestedIndexes) + '```' : 'None suggested'}` } },
    { type: "section", text: { type: "mrkdwn", text: `*Bottleneck Analysis:*\n${issuesList}` } },
    { type: "section", text: { type: "mrkdwn", text: `*Notes:*\n${notes}` } }
  ];

  if (tableSchema) blocks.push({ type: "section", text: { type: "mrkdwn", text: `*Table Schema:*\n\`\`\`${tableSchema}\`\`\`` } });
  if (executionPlan) blocks.push({ type: "section", text: { type: "mrkdwn", text: `*Execution Plan:*\n\`\`\`${executionPlan}\`\`\`` } });

  // final attachments contain speedup and validation status
  const message = {
    text: `🔍 New SQL Analysis from Webhook API`,
    blocks,
    attachments: [ { color: severityColor[severity] || severityColor['low'], fields: [ { title: "Speedup Estimate", value: `${speedupPct}%`, short: true }, { title: "Validation Status", value: analysis?.validator_status === "valid" ? ":segno_spunta_bianco: Valid" : "⚠️ Needs Review", short: true } ] } ]
  };

  try {
    console.log('[SLACK] sending...');
    const resp = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(message) });
    if (!resp.ok) console.error('[SLACK] failed', resp.status);
  } catch (err) {
    console.error('[SLACK] Error sending notification:', err);
  }
}

export function buildSlackMessage(body: Record<string, unknown>, analysis: AnalysisShape) {
  // reuse the same logic to construct the message but return it instead of posting
  const severityColor: Record<string, string> = { low: "#10b981", medium: "#f59e0b", high: "#ef4444", critical: "#dc2626" };
  const severity = String(analysis?.severity || 'low').toLowerCase();
  const score = analysis?.score ?? 'N/A';
  const issuesList = (Array.isArray(analysis?.issues) && analysis!.issues!.length) ? (analysis!.issues!.map((i: unknown) => `• ${String(i)}`).join('\n')) : 'None detected';
  const suggestedIndexes = analysis?.suggestedIndex || analysis?.suggestedIndexes || null;
  const notes = analysis?.semantic_warning || analysis?.notes || analysis?.note || 'No notes provided';
  const optimized = analysis?.rewrittenQuery || analysis?.optimized_query || null;
  const speedupPct = Math.round(((analysis?.speedupEstimate ?? 0) * 100));
  const sql = String(body['sql'] || '');
  const tableSchema = body['database_schema'] ? String(body['database_schema']) : (body['schema'] ? String(body['schema']) : null);
  const executionPlan = body['explain_plan'] ? String(body['explain_plan']) : (body['explain'] ? String(body['explain']) : null);

  const blocks: unknown[] = [
    { type: "header", text: { type: "plain_text", text: "🔍 SQL Query Analyzed via Webhook API" } },
    { type: "section", fields: [ { type: "mrkdwn", text: `*Severity:* ${severity.toUpperCase()}` }, { type: "mrkdwn", text: `*Score:* ${score}/100` } ] },
    { type: "section", text: { type: "mrkdwn", text: `*Original Query:*\n\`\`\`${sql}\`\`\`` } },
    { type: "section", text: { type: "mrkdwn", text: `*Optimized Query:*\n\`\`\`${optimized || 'No rewrite available'}\`\`\`` } },
    { type: "section", text: { type: "mrkdwn", text: `*Suggested Indexes:*\n${suggestedIndexes ? '```' + String(suggestedIndexes) + '```' : 'None suggested'}` } },
    { type: "section", text: { type: "mrkdwn", text: `*Bottleneck Analysis:*\n${issuesList}` } },
    { type: "section", text: { type: "mrkdwn", text: `*Notes:*\n${notes}` } }
  ];
  if (tableSchema) blocks.push({ type: "section", text: { type: "mrkdwn", text: `*Table Schema:*\n\`\`\`${tableSchema}\`\`\`` } });
  if (executionPlan) blocks.push({ type: "section", text: { type: "mrkdwn", text: `*Execution Plan:*\n\`\`\`${executionPlan}\`\`\`` } });

  const message = {
    text: `🔍 New SQL Analysis from Webhook API`,
    blocks,
    attachments: [ { color: severityColor[severity] || severityColor['low'], fields: [ { title: "Speedup Estimate", value: `${speedupPct}%`, short: true }, { title: "Validation Status", value: analysis?.validator_status === "valid" ? ":segno_spunta_bianco: Valid" : "⚠️ Needs Review", short: true } ] } ]
  };
  return message;
}
