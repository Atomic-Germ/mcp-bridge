# API Documentation for the MCP Ecosystem

This directory contains comprehensive API documentation for all MCPs in the ecosystem.

## 📚 Quick Start

**Start here**: [`API_INDEX.md`](API_INDEX.md)

This is your navigation hub for:
- Overview of all 4 MCPs
- Quick links to specific APIs
- File structure and organization
- Key concepts explained

## 🔗 Integration Guide

**See complete workflows**: [`API_INTEGRATION_GUIDE.md`](API_INTEGRATION_GUIDE.md)

Covers:
- Full meditation → critique → meditation cycle
- Data flow diagrams
- Complete code examples
- Testing patterns
- Troubleshooting

## 📖 Individual API References

| Repository | Location | Purpose |
|---|---|---|
| **mcp-creative** | [`mcp-creative/API.md`](mcp-creative/API.md) | Meditation cycles, insight generation |
| **mcp-consult** | [`mcp-consult/docs/API_REFERENCE.md`](mcp-consult/docs/API_REFERENCE.md) | Ollama model consultation |
| **mcp-bridge** | [`mcp-bridge/API.md`](mcp-bridge/API.md) | Session logging, mode-switching |
| **mcp-dream-weaver** | [`mcp-dream-weaver/API.md`](mcp-dream-weaver/API.md) | Narrative weaving |

## 🎯 Use Cases

### I want to understand the ecosystem
→ Start with [`API_INDEX.md`](API_INDEX.md)

### I want to integrate the MCPs
→ Follow [`API_INTEGRATION_GUIDE.md`](API_INTEGRATION_GUIDE.md)

### I want to use a specific tool
→ Find it in the relevant `API.md` (see table above)

### I want to add/modify a tool
→ Update the tool's `API.md` and [`API_INTEGRATION_GUIDE.md`](API_INTEGRATION_GUIDE.md)

### I'm troubleshooting an issue
→ Check the "Common Issues" section in [`API_INTEGRATION_GUIDE.md`](API_INTEGRATION_GUIDE.md)

## 📊 Documentation Overview

```
Total Documentation: ~82 KB

├── API_INDEX.md (7.8 KB)
│   └─ Navigation hub, quick reference
│
├── API_INTEGRATION_GUIDE.md (17.4 KB)
│   └─ Complete workflows, code examples, testing
│
├── mcp-creative/API.md (5.8 KB)
│   └─ 3 tools: creative_meditate, creative_insight, creative_ponder
│
├── mcp-consult/docs/API_REFERENCE.md (14 KB)
│   └─ 5 tools: consult_ollama, list_ollama_models, compare, remember, chain
│
├── mcp-bridge/API.md (21.5 KB) ← NEW
│   └─ 8 tools: start_session, log_meditation, log_consult, suggest_mode_switch,
│               get_context_for_consult, get_critique_for_meditation,
│               get_session_trace, weave_session
│
└── mcp-dream-weaver/API.md (16.3 KB) ← NEW
    └─ 1 tool: weave_dream
```

## ✅ What's Documented

- **17 Tools** across 4 MCPs
- **Input/Output Schemas** for all tools
- **Data Models** for each MCP
- **Error Handling** specifications
- **Configuration** options
- **Performance** targets
- **Integration** patterns
- **Code Examples** for each tool
- **Complete Workflows** from start to finish

## 🚀 Integration Workflow at a Glance

```
1. bridge_start_session()
2. Loop:
   - creative_meditate()
   - bridge_log_meditation()
   - bridge_suggest_mode_switch()
   - If switch suggested:
     - bridge_get_context_for_consult()
     - consult_ollama()
     - bridge_log_consult()
     - bridge_get_critique_for_meditation()
   - Back to step 2 with new context
3. bridge_get_session_trace()
4. weave_dream()
```

See [`API_INTEGRATION_GUIDE.md`](API_INTEGRATION_GUIDE.md) for full code examples.

## 🔄 Keeping MCPs Aligned

When you:
- **Add a tool**: Update the repository's API.md, then update API_INTEGRATION_GUIDE.md
- **Change parameters**: Update the tool's API.md documentation
- **Break something**: Update the compatibility matrix in API_INTEGRATION_GUIDE.md
- **Update versions**: Keep the version compatibility table current

## 📝 How to Navigate

### For Developers New to the Ecosystem
1. Read this file (you're here!)
2. Open [`API_INDEX.md`](API_INDEX.md)
3. Follow the "Quick Links" section
4. Start with [`API_INTEGRATION_GUIDE.md`](API_INTEGRATION_GUIDE.md#example-full-session-in-code)

### For Integration Development
1. Check [`API_INTEGRATION_GUIDE.md`](API_INTEGRATION_GUIDE.md)
2. Find your use case in the workflow section
3. Reference specific tools in their API.md files
4. Use code examples as templates

### For Maintenance
1. Check [`API_INDEX.md`](API_INDEX.md) for file locations
2. Update the relevant `API.md`
3. If breaking changes: update [`API_INTEGRATION_GUIDE.md`](API_INTEGRATION_GUIDE.md)
4. Update compatibility matrix if needed

## 🎨 Documentation Format

All API.md files follow the same structure:
1. **Tool Overview** - What it does
2. **Input Schema** - Parameters with types
3. **Returns** - Output format with types
4. **Example** - Code example
5. **Behavior Details** - How it works
6. **Performance** - Speed expectations
7. **Integration** - How it fits with other tools

## 🔗 Key Concepts Explained

**In API_INDEX.md**:
- Heuristics (mode-switching)
- Context Injection (prompt formatting)
- Insight Extraction (concept detection)
- Dream Weaving (narrative generation)

## ❓ FAQ

**Q: Where do I start?**  
A: Open [`API_INDEX.md`](API_INDEX.md)

**Q: How do I integrate the MCPs?**  
A: Follow [`API_INTEGRATION_GUIDE.md`](API_INTEGRATION_GUIDE.md)

**Q: What's the complete workflow?**  
A: See "Example: Full Session in Code" in API_INTEGRATION_GUIDE.md

**Q: How do I track API changes?**  
A: Check "API Changes and Versioning" in API_INTEGRATION_GUIDE.md

**Q: What if something breaks?**  
A: See "Common Issues & Solutions" in API_INTEGRATION_GUIDE.md

## 📞 Support

- **Architecture questions**: See [`API_INDEX.md`](API_INDEX.md#design-philosophy)
- **Integration help**: See [`API_INTEGRATION_GUIDE.md`](API_INTEGRATION_GUIDE.md)
- **Tool-specific issues**: Check the tool's API.md and error handling section
- **Testing help**: See testing patterns in API_INTEGRATION_GUIDE.md

## 🎯 Next Steps

1. Open [`API_INDEX.md`](API_INDEX.md) to get oriented
2. Read [`API_INTEGRATION_GUIDE.md`](API_INTEGRATION_GUIDE.md) for the full workflow
3. Find your specific use case and follow the examples
4. Refer back to individual `API.md` files as needed

---

**Last Updated**: 2025-12-08  
**Status**: Complete - All MCPs aligned and documented
**Total Coverage**: 17 tools, 82.8 KB of documentation

Start with [`API_INDEX.md`](API_INDEX.md) →
