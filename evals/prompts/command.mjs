export default function ({ vars }) {
  let prompt = `${vars.system_prompt}

Here are the project files for reference:

${vars.context}

Respond directly based on the files provided above. Do not attempt to read files or use tools. Since you cannot write to files, output all file contents (specs, work items, decision log entries) directly in your response.`;

  if (vars.conversation) {
    prompt += "\n\nHere is the conversation so far:\n";
    for (const turn of vars.conversation) {
      prompt += `\n${turn.role}: ${turn.content}\n`;
    }
  }

  prompt += `\nUser: ${vars.user_message}`;

  return prompt;
}
