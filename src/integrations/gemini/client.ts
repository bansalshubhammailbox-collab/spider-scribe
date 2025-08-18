import { GoogleGenerativeAI } from '@google/generative-ai';

// CRITICAL: This must run server-side only (in Supabase Edge Functions)
// API keys should never be exposed client-side

export const createGeminiModel = (apiKey: string) => {
  const genai = new GoogleGenerativeAI(apiKey);
  // CRITICAL: Use gemini-1.5-flash model as specified
  return genai.getGenerativeModel({ model: 'gemini-1.5-flash' });
};

export const SME_PROMPT = `
You are a Subject Matter Expert (SME) conducting an interview about a database.

Your goal: Generate hypothesis-driven questions to validate your understanding.

For each table and column, you must:
1. Form a hypothesis about what the data represents in business terms
2. Generate validation questions to confirm or refine your hypothesis
3. For categorical columns, populate enum_values_found with actual sample values
4. Focus on business logic, relationships, and data quality considerations

Generate questions in these categories:
- yes_no: Binary validation questions
- multiple_choice: Questions with predefined options  
- free_text_definitions: Open-ended business context questions

Return valid JSON matching the schema structure with sample data context.

Schema to analyze:
`;

export const generateAnnotations = async (
  model: any, 
  schema: any, 
  customPrompt?: string
): Promise<any> => {
  try {
    const prompt = customPrompt || SME_PROMPT;
    const fullPrompt = `${prompt}\n\n${JSON.stringify(schema, null, 2)}`;
    
    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();
    
    // Try to parse as JSON, fallback to structured format
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      // If JSON parsing fails, create structured annotation format
      return {
        database: schema.database,
        generated_at: new Date().toISOString(),
        sample_rows: getSampleRowCount(schema),
        annotations: {
          tables: {},
          business_context: responseText,
          generated_questions: extractQuestionsFromText(responseText)
        }
      };
    }
  } catch (error) {
    console.error('Gemini generation error:', error);
    throw error;
  }
};

export const generate3WaySQL = async (
  model: any,
  question: string,
  database: string,
  schema?: any,
  annotations?: any,
  customPrompt?: string
): Promise<{
  baseline: string;
  schemaOnly: string;
  fullContext: string;
}> => {
  
  // Baseline SQL - no context
  const baselinePrompt = `Generate SQL for this question using generic table names: ${question}`;
  const baselineResult = await model.generateContent(baselinePrompt);
  
  // Schema-only SQL - structure context
  const schemaPrompt = `Generate SQL for: ${question}\n\nDatabase: ${database}\nSchema: ${JSON.stringify(schema)}`;
  const schemaResult = await model.generateContent(schemaPrompt);
  
  // Full context SQL - annotations + schema
  const fullPrompt = customPrompt || `Generate SQL for: ${question}\n\nDatabase: ${database}\nSchema: ${JSON.stringify(schema)}\nBusiness Context: ${JSON.stringify(annotations)}`;
  const fullResult = await model.generateContent(fullPrompt);
  
  return {
    baseline: extractSQL(baselineResult.response.text()),
    schemaOnly: extractSQL(schemaResult.response.text()),
    fullContext: extractSQL(fullResult.response.text())
  };
};

// Helper functions
const getSampleRowCount = (schema: any): number => {
  for (const schemaName in schema.schemas || {}) {
    for (const tableName in schema.schemas[schemaName].tables || {}) {
      const table = schema.schemas[schemaName].tables[tableName];
      if (table.sample_data && table.sample_data.length > 0) {
        return table.sample_data.length;
      }
    }
  }
  return 0;
};

const extractQuestionsFromText = (text: string): any[] => {
  // Simple extraction of questions from generated text
  const questions = text.split('\n').filter(line => 
    line.includes('?') || line.toLowerCase().includes('question')
  );
  
  return questions.map((q, idx) => ({
    id: `q_${idx}`,
    type: 'free_text_definitions',
    question: q.trim(),
    category: 'business_context'
  }));
};

const extractSQL = (text: string): string => {
  // Extract SQL from generated text
  const sqlMatch = text.match(/```sql\s*([\s\S]*?)\s*```/i) || 
                   text.match(/```\s*(SELECT[\s\S]*?)\s*```/i);
  
  if (sqlMatch) {
    return sqlMatch[1].trim();
  }
  
  // If no code blocks, look for SELECT statements
  const selectMatch = text.match(/(SELECT[\s\S]*?(?:;|$))/i);
  return selectMatch ? selectMatch[1].trim() : text.trim();
};

export default GoogleGenerativeAI;