import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, arguments: args, credentials } = await req.json();
    
    const connectionString = credentials?.POSTGRES_CONNECTION_STRING;
    
    if (!connectionString) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'PostgreSQL connection string required. Please configure your database credentials.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse connection string
    const url = new URL(connectionString);
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.slice(1);
    const user = url.username;
    const password = url.password;

    // For security, we'll use a limited set of safe operations
    // In production, you'd use a proper PostgreSQL client like postgres.js

    let result;

    switch (tool) {
      case 'list_tables': {
        result = {
          note: 'Direct PostgreSQL connections require pg client',
          query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
          connection: { host, port, database, user: user ? '***' : undefined },
        };
        break;
      }

      case 'describe_table': {
        result = {
          note: 'Direct PostgreSQL connections require pg client',
          query: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${args.table_name}'`,
          table: args.table_name,
        };
        break;
      }

      case 'query': {
        // Only allow SELECT queries for safety
        const query = args.query?.trim().toUpperCase();
        if (!query?.startsWith('SELECT')) {
          result = { error: 'Only SELECT queries are allowed through this interface' };
          break;
        }
        result = {
          note: 'Direct PostgreSQL connections require pg client',
          query: args.query,
          connection: { host, port, database },
        };
        break;
      }

      case 'insert': {
        result = {
          note: 'INSERT operations require authenticated pg client',
          table: args.table_name,
          data: args.data,
          query: `INSERT INTO ${args.table_name} ...`,
        };
        break;
      }

      case 'update': {
        result = {
          note: 'UPDATE operations require authenticated pg client',
          table: args.table_name,
          data: args.data,
          where: args.where,
        };
        break;
      }

      case 'delete': {
        result = {
          note: 'DELETE operations require authenticated pg client',
          table: args.table_name,
          where: args.where,
        };
        break;
      }

      case 'get_indexes': {
        result = {
          note: 'Direct PostgreSQL connections require pg client',
          query: `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = '${args.table_name}'`,
          table: args.table_name,
        };
        break;
      }

      case 'get_constraints': {
        result = {
          note: 'Direct PostgreSQL connections require pg client',
          query: `SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_name = '${args.table_name}'`,
          table: args.table_name,
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Unknown tool: ${tool}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('PostgreSQL MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
