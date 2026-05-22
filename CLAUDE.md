# Optimization Guidelines

## General Development Workflow
- Create Implementation plan with Antigravity (Gemini Pro 3.1 high)
- Implement code with Claude
- Test with playwright cli

## Beginner Optimization
- **Clear Chat before each task**: LLMs are stateless, longer conversations take up more context and use limits fast. Use `/clear` to clear a chat from time to time, between independent tasks.
- **Disconnect MCP Servers**: Saves on cost as we don't need to load all tool definitions. Run `/mcp` to look at existing servers, remove what you dont need. Use cli instead of the tools.
- **Batch Prompts into one Message**: Ask everything at once, dont do part by part work. If Claude gets something wrong, edit the original message and restart the chat. History kills the chat context because follow-up adds on to context.
- **Plan mode before any real task**: Doesn't apply to our pipeline, but keeping here for completion. Plan an approach and only then when approved, let Claude work on the implementation. "Do not make any changes until you have 95% confidence in what you need to build. Ask me follow up questions until you reach that confidence."
- **Run `/context` and `/cost`**: `/context` shows you exactly what is eating your tokens, conversation history size, MCP overhead, loaded files, everything. `/cost` shows actual token usage and estimates spend.
- **Set up a Status Line**: Use `/statusline` for more understanding and knowing where your'e consuming and if your'e near limit.
- **Keep Dashboard Open**: Keep checking usage in browser.
- **Be smart with Pasting**: Don't paste entire file unless its unnecessary context.
- **Watch Claude work**: Check what Claude is doing.

## Experienced Optimization
- **Lean CLAUDE.md**: Make the `CLAUDE.md` smaller <200 lines, only keep essential info and any prompts that are required by the agent.
- **Give exact file names and issues**: Refer to General Development Workflow.
- **Compact at 60%**: Auto compact triggers at ~95%, too late. Run `/compact` to check capacity % if its around 60%, run `/compact` with specific instructions on what to preserve. After 3-4 compacts, quality degrades. Ask Claude to write a session summary and `/clear` the chat.
- **5 Minute Reprocess**: Claude cache only lasts 5 mins, after that everything needs reprocessing, dont leave for more than 5 mins, use `/compact` or `/clear` at that point.
- **Command Output bloat**: Use [rtk](https://github.com/rtk-ai/rtk) to make command output smaller.
- **LLM Output bloat**: Use [caveman](https://github.com/juliusbrussee/caveman) to lower output tokens. *Brain still big, mouth small*

## Professional Optimization
- **Pick the right model**: Sonnet - Default for most coding work. Haiku - Subagents, formatting, simple tasks. Opus - Deep architectural planning only (Just use gemini pro 3.1).
- **Peak Hours**: Usage drains more when working during peak hours, i.e 8am to 2 pm ET on weekdays. Run bigger tasks off-peak.
