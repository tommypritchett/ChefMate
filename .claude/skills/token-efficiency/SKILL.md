---
name: token-efficiency
description: Enforce token-efficient Claude Code behavior on every task. Use this skill whenever starting any session, planning multi-step changes, editing large files, making UI or design changes, or running any task that touches more than one file. This skill should trigger automatically at the start of every session and before every significant code change. Do not skip this skill because a task seems small — the most expensive sessions started with tasks that seemed small.
---

# Token Efficiency Rules for Claude Code

These rules exist because unbounded file reads, parallel agents, and large accumulated session context can burn an entire usage session in minutes on tasks that should cost very little. Every rule here comes from a real failure mode.

---

## Rule 1: Grep Before You Read — Always

Before opening any file, search for the exact pattern you need.

**Never do this:**
- Read a 2,000+ line file to find a one-line change
- Open a file "to understand the structure" without a specific target

**Always do this:**
```
Grep pattern="your_target" in filename.tsx → get line numbers
Read only those lines ±5 lines of context
Make the targeted edit
```

**Why it matters:** Reading a 137KB file to change 3 strings costs ~35,000 tokens. A Grep costs ~10. That's a 3,500x difference for the same result.

---

## Rule 2: No Parallel Agents Without Explicit Permission

Never spawn parallel sub-agents unless the user explicitly says "run these in parallel" or "use parallel agents."

**Default behavior:** Sequential. One task, one agent, one file at a time.

**Why it matters:** 5 parallel agents don't share context — each one loads files independently. A task that costs 50,000 tokens sequentially costs 250,000 tokens in parallel. A full session can be consumed in under 15 minutes.

**When parallel agents are appropriate:**
- User explicitly requests it
- Tasks are fully independent with zero shared files
- Each sub-task is small and well-scoped

---

## Rule 3: Audit Before Acting on Large Tasks

When a request touches more than 3 files or involves sweeping changes (color system updates, refactors, UI overhauls), always audit first and present a plan before making any changes.

**The pattern:**
1. Use Grep and file size checks to map the scope — do not read full files
2. Report: which files are affected, estimated lines touched, proposed approach
3. Wait for user confirmation
4. Execute sequentially

**Why it matters:** A "replace all emerald green across the app" request spawned 5 parallel agents consuming 265,000 tokens. An audit first would have revealed the scope, allowed a targeted sequential approach, and cost a fraction of that.

---

## Rule 4: Check File Size Before Reading

Before reading any file in full, check its line count.

```bash
wc -l filename.tsx
```

- **Under 300 lines:** Safe to read in full if needed
- **300–800 lines:** Read only the relevant section, use Grep to find it
- **800+ lines:** Never read in full. Grep only. Consider flagging for refactor.

Files over 800 lines are a signal that the file should eventually be split into smaller components. Note this to the user but do not refactor unless asked.

---

## Rule 5: One Session, One Scope

A session should have a single clearly defined scope. Do not attempt to complete unrelated tasks in the same session.

**Good session scope:**
- "Fix navigation back button across profile screens"
- "Update Compare Tab to match mockup"
- "Split shopping.tsx into component files"

**Bad session scope:**
- "Fix all the things we discussed"
- "Update the whole UI and also fix bugs and also refactor"

If a user provides a large multi-part request, complete the tasks sequentially and flag if token usage is getting high before starting the next task. Do not silently continue until the session is exhausted.

---

## Rule 6: Reference Files Are Read-Once

Mockup files, design specs, and reference documents should be read once per session, extracting only what is needed. Never re-read a reference file to check something — extract the relevant section on first read and keep it in context.

When reading a mockup or reference to inform an implementation:
- Read only the structural HTML, not the full CSS
- Extract the element hierarchy and class names
- Do not re-open the file after the first read

---

## Rule 7: Report Token Risk Mid-Session

If a task is larger than expected or file sizes are significantly bigger than anticipated, stop and report this to the user before continuing:

> "This file is [X] lines. The change you need is on line [N]. Proceeding with a targeted edit — this should be low cost. / Heads up — this is larger than expected and may consume significant context. Want me to proceed or scope this differently?"

Give the user the choice. Never silently burn through a session on a task that turned out to be larger than expected.

---

## Quick Reference Checklist

Before starting any task:
- [ ] Have I Grepped for the target before opening any file?
- [ ] Have I checked file sizes with `wc -l`?
- [ ] Am I working sequentially, not spawning parallel agents?
- [ ] Is this session scoped to one clear job?
- [ ] If this is a large change, have I audited and confirmed with the user first?
- [ ] Have I flagged any files over 800 lines for eventual refactor?

---

## Real Example: What This Skill Prevents

A 3-task session (change a text string, change a number from 3→5, update a UI tab) consumed 79% of a full usage session because:

1. A 95KB file was read in full to change 3 strings (fix: Grep first)
2. A 137KB file was read multiple times to find two one-line changes (fix: Grep first)
3. A mockup HTML file was read across two large chunks unnecessarily (fix: read structural HTML only)
4. The session carried forward thousands of tokens of prior conversation context (fix: new session per scope)

Total preventable waste: ~70% of all tokens used. Every one of these was avoidable with the rules above.
