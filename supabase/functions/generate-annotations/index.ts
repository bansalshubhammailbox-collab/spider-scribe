import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SME_PROMPT = `
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
`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { schema, customPrompt } = await req.json();
    
    if (!schema) {
      return new Response(JSON.stringify({ 
        error: 'Schema data is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating annotations for database: ${schema.database}`);
    
    // Get Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ 
        error: 'GEMINI_API_KEY not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Import Google Generative AI
    const { GoogleGenerativeAI } = await import('https://esm.sh/@google/generative-ai@0.21.0');
    
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prepare schema data for prompt
    const schemaText = JSON.stringify(schema, null, 2);
    const finalPrompt = customPrompt 
      ? `${customPrompt}\n\n${SME_PROMPT}\n\nSchema Data:\n${schemaText}`
      : `${SME_PROMPT}\n\nSchema Data:\n${schemaText}`;

    console.log('Sending request to Gemini 1.5-flash...');
    
    // Generate annotations
    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    let generatedText = response.text();

    // Clean up the response to extract JSON
    generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let annotations;
    try {
      annotations = JSON.parse(generatedText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      
      // Try to extract JSON from the text if it's embedded
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          annotations = JSON.parse(jsonMatch[0]);
        } catch (secondParseError) {
          throw new Error('Generated content is not valid JSON: ' + generatedText.substring(0, 200));
        }
      } else {
        throw new Error('No JSON found in generated content: ' + generatedText.substring(0, 200));
      }
    }

    // Add metadata
    const annotationData = {
      database: schema.database,
      display_name: schema.display_name,
      sample_rows: schema.sample_rows,
      generated_at: new Date().toISOString(),
      model_used: "gemini-1.5-flash",
      custom_prompt: customPrompt || null,
      annotations: annotations
    };

    // Store in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileName = `${schema.display_name}_sme_questions_${schema.sample_rows}rows.json`;
    const fileSize = JSON.stringify(annotationData).length;
    
    const { error: insertError } = await supabase
      .from('annotation_files')
      .insert({
        database_name: schema.display_name,
        sample_rows: schema.sample_rows,
        file_name: fileName,
        annotations_data: annotationData,
        file_size: fileSize
      });

    if (insertError) {
      console.error('Error storing annotations in Supabase:', insertError);
    } else {
      console.log(`Annotations stored in Supabase: ${fileName}`);
    }

    return new Response(JSON.stringify(annotationData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-annotations function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to generate annotations with Gemini 1.5-flash'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});