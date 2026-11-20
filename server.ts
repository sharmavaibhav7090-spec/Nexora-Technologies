import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'nexora-technologies' });
  });

  app.post('/api/ai/insights', async (req: Request, res: Response) => {
    try {
      const { businessName, currency, financialYear, snapshot } = req.body ?? {};
      if (!snapshot || !businessName) {
        res.status(400).json({ error: 'Missing required financial snapshot or businessName.' });
        return;
      }

      const ai = getGeminiClient();
      const prompt = `You are a senior chartered accountant and business intelligence analyst for Indian SMEs.
Analyze the following verified financial snapshot for "${businessName}" (Currency: ${currency || 'INR'}, Financial Year: ${financialYear || 'FY 2026-27'}).

Financial Snapshot JSON:
${JSON.stringify(snapshot, null, 2)}

Generate exactly 4 concise, accurate insights — one for each analytics type:
1. "Descriptive" (What happened based on the numbers)
2. "Diagnostic" (Why it happened, referencing actual categories/departments/receivables)
3. "Predictive" (What may happen next — clearly framed as an estimate, not a guaranteed outcome)
4. "Prescriptive" (Practical, actionable recommendation for management)

Do not invent numbers not supported by the snapshot. Keep each field crisp and executive-ready.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Provide accurate, conservative Indian SME financial analysis. Clearly frame projections as estimates. Never fabricate figures.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                analyticsType: {
                  type: Type.STRING,
                  description: 'Must be one of: Descriptive, Diagnostic, Predictive, Prescriptive',
                },
                relatedMetric: { type: Type.STRING },
                observation: { type: Type.STRING },
                explanation: { type: Type.STRING },
                suggestedAction: { type: Type.STRING },
                confidenceLevel: {
                  type: Type.STRING,
                  description: 'Must be one of: High, Moderate, Preliminary',
                },
              },
              required: [
                'analyticsType',
                'relatedMetric',
                'observation',
                'explanation',
                'suggestedAction',
                'confidenceLevel',
              ],
            },
          },
        },
      });

      const rawText = (response.text ?? '[]').trim();
      const parsed = JSON.parse(rawText);
      res.json({ insights: parsed, model: 'gemini-4-hydrogen' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate AI insights.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/ai/sql', async (req: Request, res: Response) => {
    try {
      const { question, businessName, schemaSummary } = req.body ?? {};
      if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Please provide an analytics question.' });
        return;
      }

      const ai = getGeminiClient();
      const prompt = `Translate the user's business analytics question into a clean, read-only SQL query (SELECT only) for the Nexora Technologies relational schema.

Business: ${businessName || 'Current Business'}
Schema Tables:
${schemaSummary || `
- transactions(transaction_id, business_id, type, date, party_name, category, department, invoice_number, product_or_service, amount, gst_amount, payment_status, payment_method)
- accounts(account_id, business_id, code, name, account_group, balance, previous_balance)
- budgets(budget_id, business_id, month, financial_year, department, category, budget_type, target_amount)
- customers(customer_id, business_id, party_type, name, gstin, city, payment_terms_days)
- risks(risk_id, business_id, category, description, probability, impact, financial_impact, risk_score, risk_level, status)
`}

User Question: "${question}"

Return JSON with:
- sql: Valid, formatted SQL SELECT query using standard PostgreSQL/SQLite syntax.
- explanation: 1-2 sentence explanation of what the query computes.
- targetTable: Primary table queried (transactions, accounts, budgets, customers, or risks).
- intentFilter: Optional structured hint { type?: "Income"|"Expense"|null, paymentStatus?: string|null, groupBy?: "category"|"department"|"partyName"|"month"|null }`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sql: { type: Type.STRING },
              explanation: { type: Type.STRING },
              targetTable: { type: Type.STRING },
              intentFilter: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  paymentStatus: { type: Type.STRING },
                  groupBy: { type: Type.STRING },
                },
              },
            },
            required: ['sql', 'explanation', 'targetTable'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate SQL query.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/ai/report-summary', async (req: Request, res: Response) => {
    try {
      const { reportTitle, businessName, period, summaryData } = req.body ?? {};
      if (!reportTitle || !summaryData) {
        res.status(400).json({ error: 'Missing reportTitle or summaryData.' });
        return;
      }

      const ai = getGeminiClient();
      const prompt = `Write a concise, formal 3-bullet executive observation summary for a "${reportTitle}" report for "${businessName || 'the business'}" (${period || 'Current Period'}).
Base every statement strictly on these verified figures:
${JSON.stringify(summaryData, null, 2)}

Return JSON with an array of 3 strings under "observations".`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              observations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['observations'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{"observations":[]}').trim());
      res.json(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate report summary.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nexora Technologies server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Fatal server startup error:', error);
  process.exit(1);
});
