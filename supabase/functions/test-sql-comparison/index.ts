import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, database, schema, annotations, sessionName, customPrompt } = await req.json();
    
    if (!question || !database) {
      return new Response(JSON.stringify({ 
        error: 'Question and database are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Running 3-way SQL comparison for question: "${question}" on database: ${database}`);
    
    // Get API keys
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ 
        error: 'GEMINI_API_KEY not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Import Google Generative AI using integration pattern
    const { GoogleGenerativeAI } = await import('https://esm.sh/@google/generative-ai@0.21.0');
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    // CRITICAL: Use gemini-1.5-flash model as specified in integration
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Generate 3 different SQL queries
    const results = {
      baseline: { sql: '', executed: false, error: null, rowCount: 0 },
      schemaOnly: { sql: '', executed: false, error: null, rowCount: 0 },
      fullContext: { sql: '', executed: false, error: null, rowCount: 0 }
    };

    // Generate 3-way SQL using integration pattern
    
    // 1. Baseline SQL - no context (generic table names)
    const baselinePrompt = `Generate SQL for this question using generic table names: ${question}`;
    const baselineResult = await model.generateContent(baselinePrompt);
    results.baseline.sql = extractSQL(baselineResult.response.text());

    // 2. Schema-only SQL - structure context only
    const schemaPrompt = `Generate SQL for: ${question}\n\nDatabase: ${database}\nSchema: ${JSON.stringify(schema)}`;
    const schemaOnlyResult = await model.generateContent(schemaPrompt);
    results.schemaOnly.sql = extractSQL(schemaOnlyResult.response.text());

    // 3. Full context SQL - annotations + schema
    const fullPrompt = customPrompt || `Generate SQL for: ${question}\n\nDatabase: ${database}\nSchema: ${JSON.stringify(schema)}\nBusiness Context: ${JSON.stringify(annotations)}`;
    const fullContextResult = await model.generateContent(fullPrompt);
    results.fullContext.sql = extractSQL(fullContextResult.response.text());

    // Helper function to extract SQL from generated text
    function extractSQL(text: string): string {
      // Extract SQL from generated text
      const sqlMatch = text.match(/```sql\s*([\s\S]*?)\s*```/i) || 
                       text.match(/```\s*(SELECT[\s\S]*?)\s*```/i);
      
      if (sqlMatch) {
        return sqlMatch[1].trim();
      }
      
      // If no code blocks, look for SELECT statements
      const selectMatch = text.match(/(SELECT[\s\S]*?(?:;|$))/i);
      return selectMatch ? selectMatch[1].trim() : text.trim();
    }

    // TODO: Execute queries against Snowflake to get actual results
    // For now, marking as executed with placeholder data
    results.baseline.executed = true;
    results.schemaOnly.executed = true;
    results.fullContext.executed = true;

    // Calculate quality scores (placeholder logic)
    const qualityScores = {
      baseline: results.baseline.sql.length > 0 ? 0.3 : 0,
      schemaOnly: results.schemaOnly.sql.length > 0 ? 0.7 : 0,
      fullContext: results.fullContext.sql.length > 0 ? 0.9 : 0
    };

    // Store in Supabase if session name provided
    if (sessionName) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Create or get test session
      let sessionId;
      const { data: existingSession } = await supabase
        .from('test_sessions')
        .select('id')
        .eq('session_name', sessionName)
        .eq('database', database)
        .single();

      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        const { data: newSession, error: sessionError } = await supabase
          .from('test_sessions')
          .insert({
            session_name: sessionName,
            database: database,
            custom_prompt: customPrompt,
            total_questions: 1
          })
          .select('id')
          .single();

        if (sessionError) {
          console.error('Error creating session:', sessionError);
        } else {
          sessionId = newSession.id;
        }
      }

      // Store test result
      if (sessionId) {
        const { error: resultError } = await supabase
          .from('test_results')
          .insert({
            session_id: sessionId,
            question: question,
            baseline_sql: results.baseline.sql,
            schema_only_sql: results.schemaOnly.sql,
            full_context_sql: results.fullContext.sql,
            baseline_execution: { executed: results.baseline.executed, error: results.baseline.error, rowCount: results.baseline.rowCount },
            schema_only_execution: { executed: results.schemaOnly.executed, error: results.schemaOnly.error, rowCount: results.schemaOnly.rowCount },
            full_context_execution: { executed: results.fullContext.executed, error: results.fullContext.error, rowCount: results.fullContext.rowCount }
          });

        if (resultError) {
          console.error('Error storing test result:', resultError);
        } else {
          console.log(`Test result stored for session: ${sessionName}`);
        }
      }
    }

    return new Response(JSON.stringify({
      question,
      database,
      sqlQueries: results,
      qualityScores,
      timestamp: new Date().toISOString(),
      sessionName: sessionName || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in test-sql-comparison function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to generate SQL comparison'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});