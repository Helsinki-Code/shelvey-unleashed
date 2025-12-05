import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShellRequest {
  action: 'submit' | 'approve' | 'reject' | 'execute' | 'history';
  command?: string;
  working_directory?: string;
  command_id?: string;
  limit?: number;
}

// Commands that require approval
const DANGEROUS_PATTERNS = [
  /rm\s+-rf/i,
  /rm\s+-r/i,
  /rm\s+--recursive/i,
  /rmdir/i,
  /dd\s+if=/i,
  /mkfs/i,
  /fdisk/i,
  /format/i,
  /del\s+\/s/i,
  /shutdown/i,
  /reboot/i,
  /init\s+[06]/i,
  /chmod\s+777/i,
  /chown\s+-R/i,
  />\s*\/dev\/sd/i,
  /curl.*\|\s*sh/i,
  /wget.*\|\s*sh/i,
  /eval/i,
  /exec/i,
  /sudo/i,
  /su\s+-/i,
  /passwd/i,
  /userdel/i,
  /groupdel/i,
  /drop\s+database/i,
  /drop\s+table/i,
  /truncate/i,
  /delete\s+from/i,
  /--no-preserve-root/i,
];

const MEDIUM_RISK_PATTERNS = [
  /npm\s+install/i,
  /yarn\s+add/i,
  /pip\s+install/i,
  /apt-get\s+install/i,
  /brew\s+install/i,
  /git\s+push/i,
  /git\s+reset\s+--hard/i,
  /git\s+checkout\s+-f/i,
  /mv\s+/i,
  /cp\s+-r/i,
  /chmod/i,
  /chown/i,
  /kill/i,
  /pkill/i,
];

function assessRiskLevel(command: string): 'low' | 'medium' | 'high' | 'critical' {
  const normalizedCommand = command.toLowerCase().trim();
  
  // Check for critical/dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(normalizedCommand)) {
      // Some are critical (destructive)
      if (/rm\s+-rf|dd\s+if=|mkfs|drop\s+database|--no-preserve-root/.test(normalizedCommand)) {
        return 'critical';
      }
      return 'high';
    }
  }
  
  // Check for medium risk patterns
  for (const pattern of MEDIUM_RISK_PATTERNS) {
    if (pattern.test(normalizedCommand)) {
      return 'medium';
    }
  }
  
  return 'low';
}

function requiresApproval(riskLevel: string): boolean {
  return riskLevel === 'high' || riskLevel === 'critical';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: ShellRequest = await req.json();
    const { action } = body;

    let result;

    switch (action) {
      case 'submit':
        result = await submitCommand(body, user.id, supabase);
        break;
      case 'approve':
        result = await approveCommand(body, user.id, supabase);
        break;
      case 'reject':
        result = await rejectCommand(body, user.id, supabase);
        break;
      case 'execute':
        result = await executeCommand(body, user.id, supabase);
        break;
      case 'history':
        result = await getHistory(user.id, supabase, body.limit);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Shell executor error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function submitCommand(body: ShellRequest, userId: string, supabase: any) {
  const { command, working_directory } = body;
  
  if (!command) {
    throw new Error('Command is required');
  }

  const riskLevel = assessRiskLevel(command);
  const needsApproval = requiresApproval(riskLevel);

  // Insert the command
  const { data: cmdRecord, error } = await supabase
    .from('shell_command_approvals')
    .insert({
      user_id: userId,
      command,
      working_directory: working_directory || '/',
      risk_level: riskLevel,
      status: needsApproval ? 'pending' : 'approved',
      approved_at: needsApproval ? null : new Date().toISOString(),
      metadata: {
        submitted_at: new Date().toISOString(),
        auto_approved: !needsApproval
      }
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to submit command: ${error.message}`);
  }

  // If auto-approved (low/medium risk), execute immediately
  if (!needsApproval) {
    const execResult = await simulateExecution(command, working_directory);
    
    await supabase
      .from('shell_command_approvals')
      .update({
        status: execResult.success ? 'executed' : 'failed',
        output: execResult.output,
        error: execResult.error,
        executed_at: new Date().toISOString()
      })
      .eq('id', cmdRecord.id);

    return {
      success: true,
      command_id: cmdRecord.id,
      risk_level: riskLevel,
      requires_approval: false,
      executed: true,
      output: execResult.output,
      error: execResult.error
    };
  }

  return {
    success: true,
    command_id: cmdRecord.id,
    risk_level: riskLevel,
    requires_approval: true,
    message: `Command requires approval due to ${riskLevel} risk level`
  };
}

async function approveCommand(body: ShellRequest, userId: string, supabase: any) {
  const { command_id } = body;
  
  if (!command_id) {
    throw new Error('command_id is required');
  }

  // Get and verify the command
  const { data: cmd, error: fetchError } = await supabase
    .from('shell_command_approvals')
    .select('*')
    .eq('id', command_id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !cmd) {
    throw new Error('Command not found');
  }

  if (cmd.status !== 'pending') {
    throw new Error(`Command already ${cmd.status}`);
  }

  // Update status to approved
  const { error: updateError } = await supabase
    .from('shell_command_approvals')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString()
    })
    .eq('id', command_id);

  if (updateError) {
    throw new Error(`Failed to approve command: ${updateError.message}`);
  }

  return {
    success: true,
    command_id,
    message: 'Command approved. You can now execute it.'
  };
}

async function rejectCommand(body: ShellRequest, userId: string, supabase: any) {
  const { command_id } = body;
  
  if (!command_id) {
    throw new Error('command_id is required');
  }

  const { error } = await supabase
    .from('shell_command_approvals')
    .update({
      status: 'rejected',
      metadata: {
        rejected_at: new Date().toISOString()
      }
    })
    .eq('id', command_id)
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (error) {
    throw new Error(`Failed to reject command: ${error.message}`);
  }

  return {
    success: true,
    command_id,
    message: 'Command rejected'
  };
}

async function executeCommand(body: ShellRequest, userId: string, supabase: any) {
  const { command_id } = body;
  
  if (!command_id) {
    throw new Error('command_id is required');
  }

  // Get and verify the command is approved
  const { data: cmd, error: fetchError } = await supabase
    .from('shell_command_approvals')
    .select('*')
    .eq('id', command_id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !cmd) {
    throw new Error('Command not found');
  }

  if (cmd.status !== 'approved') {
    throw new Error(`Cannot execute command with status: ${cmd.status}`);
  }

  // Simulate execution (in production, this would use actual shell execution)
  const execResult = await simulateExecution(cmd.command, cmd.working_directory);

  // Update with results
  await supabase
    .from('shell_command_approvals')
    .update({
      status: execResult.success ? 'executed' : 'failed',
      output: execResult.output,
      error: execResult.error,
      executed_at: new Date().toISOString()
    })
    .eq('id', command_id);

  return {
    success: execResult.success,
    command_id,
    output: execResult.output,
    error: execResult.error
  };
}

async function simulateExecution(command: string, workingDir?: string): Promise<{
  success: boolean;
  output: string;
  error: string | null;
}> {
  // In a real implementation, this would execute commands in a sandboxed environment
  // For now, we simulate common commands
  
  const normalizedCmd = command.trim().toLowerCase();
  
  // Simulate some common commands
  if (normalizedCmd.startsWith('echo ')) {
    return {
      success: true,
      output: command.substring(5).replace(/["']/g, ''),
      error: null
    };
  }
  
  if (normalizedCmd === 'pwd') {
    return {
      success: true,
      output: workingDir || '/home/user/project',
      error: null
    };
  }
  
  if (normalizedCmd === 'ls' || normalizedCmd.startsWith('ls ')) {
    return {
      success: true,
      output: 'src/\nnode_modules/\npackage.json\ntsconfig.json\nREADME.md',
      error: null
    };
  }
  
  if (normalizedCmd.startsWith('cat ')) {
    return {
      success: true,
      output: '// File contents would appear here\nexport default function() {\n  return <div>Hello</div>;\n}',
      error: null
    };
  }
  
  if (normalizedCmd === 'whoami') {
    return {
      success: true,
      output: 'shelvey-agent',
      error: null
    };
  }
  
  if (normalizedCmd.startsWith('npm ') || normalizedCmd.startsWith('yarn ')) {
    return {
      success: true,
      output: `Simulated: ${command}\n✓ Operation completed successfully`,
      error: null
    };
  }
  
  if (normalizedCmd.startsWith('git ')) {
    return {
      success: true,
      output: `Simulated git operation: ${command}`,
      error: null
    };
  }

  // Default simulation response
  return {
    success: true,
    output: `[Simulated] Command executed: ${command}\nWorking directory: ${workingDir || '/'}`,
    error: null
  };
}

async function getHistory(userId: string, supabase: any, limit?: number) {
  const { data, error } = await supabase
    .from('shell_command_approvals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit || 50);

  if (error) {
    throw new Error(`Failed to fetch history: ${error.message}`);
  }

  return {
    success: true,
    commands: data
  };
}
