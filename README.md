# Fast Bridge - MCP Cognitive Bridge

The Contemplative Bridge - A cognitive transition layer connecting creative and consult MCPs. Logs meditation↔critique cycles, detects optimal mode-switch moments, and injects context seamlessly.

## Overview

Fast Bridge is a sophisticated MCP (Model Context Protocol) server that acts as a cognitive bridge between creative ideation (diverge mode) and critical analysis (converge mode). It maintains a contemplative memory of the creative process, extracting insights from meditations and critiques to provide optimal mode-switching suggestions.

## Key Features

- **Session Management**: Start and resume contemplative sessions
- **Meditation Logging**: Log creative outputs from mcp-creative with automatic insight extraction
- **Critique Logging**: Log analytical feedback from mcp-consult with relevance assessment
- **Mode Switch Detection**: Intelligent heuristics detect optimal moments to switch between creative and critical modes
- **Context Injection**: Prepare formatted context for consult sessions and extract feedback for meditations
- **Persistent Storage**: Save and resume sessions across MCP server restarts

## Architecture

### Core Components

1. **NLP Utilities**: Basic natural language processing for concept extraction and similarity calculation
2. **Insight Extractor**: Extracts meaningful patterns, novelty scores, and semantic clusters from text
3. **Mode Switch Heuristics**: Four heuristics detect optimal transition moments:
   - Semantic saturation (concept repetition)
   - Pause detection (user incubation time)
   - Novelty drop (ideas getting stale)
   - Critique freshness (feedback plateau)
4. **Storage Manager**: JSON-based persistence of contemplative memory
5. **Bridge Engine**: Main orchestration logic

### Data Flow

```
mcp-creative → Bridge (log_meditation) → Insight Extraction → Context Preparation → mcp-consult
    ↑                                                                            ↓
    └─────────────────────── Critique Feedback ←───────────────────────────────┘
```

## MCP Tools

### Session Management
- `bridge_start_session()`: Start a new contemplative session
- `bridge_resume_session(session_id)`: Resume an existing session
- `bridge_get_available_sessions()`: List saved session IDs

### Logging & Analysis
- `bridge_log_meditation(emergent_sentence, context_words, ...)`: Log creative meditation
- `bridge_log_consult(model, prompt, response, ...)`: Log analytical critique
- `bridge_get_session_trace(session_id?, limit?)`: Get session history

### Context & Transition
- `bridge_get_context_for_consult(meditation_trace_id)`: Prepare context for consult
- `bridge_get_critique_for_meditation(consult_trace_id)`: Extract feedback for meditation
- `bridge_suggest_mode_switch()`: Get mode switching recommendations
- `bridge_generate_next_meditation(consult_trace_id, creativity_level?, num_suggestions?)`: Generate creative suggestions from critique feedback

## Prompts

### bridge_workflow

Complete guide for the cognitive bridge workflow between creative and critical thinking, explaining the contemplative process of alternating between divergent and convergent modes with guidance on optimal switching timing.

### session_management

Template for managing contemplative sessions effectively, with guidance on starting new sessions, resuming existing ones, and organizing multiple projects.

**Parameters:**
- `action` (optional, default: "start"): What session action to perform (start, resume, list, review)
- `session_id` (optional): Session ID for resume/review actions
- `project_context` (optional): Description of the project or thinking topic

### meditation_logging

Template for logging creative meditations with proper context and metadata, including guidance on parameter selection and understanding Bridge's automatic insight extraction.

**Parameters:**
- `emergent_sentence`: The emergent sentence from mcp-creative
- `context_words`: List of context words used
- `creative_focus` (optional): What you were trying to explore or create
- `additional_metadata` (optional): Any additional context about this meditation

### critique_logging

Template for logging critical analysis from consult sessions, with guidance on relevance assessment, feedback extraction, and integration with the contemplative workflow.

**Parameters:**
- `model_used`: Which Ollama model provided the critique
- `prompt_sent`: The prompt sent to the model
- `response_received`: The model's response
- `system_prompt_used` (optional): System prompt used (if any)
- `relevance_assessment` (optional): Your assessment of critique relevance
- `meditation_context` (optional): Which meditation this critique responds to

### mode_switch_interpretation

Template for understanding and acting on mode switch suggestions, explaining the different heuristics and confidence levels for optimal decision making.

**Parameters:**
- `current_suggestion` (optional): The suggested mode (diverge/converge)
- `confidence_level` (optional): Confidence score (0-1)
- `triggered_heuristics` (optional): Which heuristics were triggered
- `current_mode` (optional): Current session mode

### context_preparation

Template for preparing optimal context for consult sessions, with guidance on customizing Bridge-prepared context for different consultation goals.

**Parameters:**
- `meditation_trace_id`: The trace ID from a logged meditation
- `consult_goal` (optional, default: "comprehensive critique"): What you want to achieve
- `additional_context` (optional): Extra context to include
- `model_preferences` (optional): Preferred models or consultation style

### next_meditation_guidance

Template for generating the next meditation based on critique feedback, guiding the transformation of critical analysis into creative inspiration to enable thought growth through iterative refinement.

**Parameters:**
- `consult_trace_id`: The trace ID from a logged critique session
- `creativity_preference` (optional, default: 0.7): Desired creativity level (0.3-1.0)
- `num_suggestions` (optional, default: 3): Number of meditation suggestions to generate
- `growth_focus` (optional): Specific aspect of growth to emphasize

## Usage Example

```python
from main import BridgeEngine

# Initialize bridge
bridge = BridgeEngine()

# Start session
session_id, metrics = bridge.start_session()

# Log meditation
trace_id, insights, _ = bridge.log_meditation(
    emergent_sentence="Through meditation we discovered coherence synthesis",
    context_words=["coherence", "synthesis", "creative"]
)

# Get context for consult
system_prompt, user_prompt, concepts, novelty, clusters, _ = bridge.get_context_for_consult(trace_id)

# Log consult response
consult_trace_id, relevance, _, _ = bridge.log_consult(
    model="gpt-4",
    prompt=user_prompt,
    response="This concept shows great potential..."
)

# Check for mode switch
suggestion = bridge.suggest_mode_switch()
if suggestion:
    print(f"Switch to {suggestion.suggested_mode} (confidence: {suggestion.confidence:.2f})")
```

## Installation

```bash
# Install dependencies
uv add fastmcp nltk

# Run tests
python test_bridge.py

# Run demo
python demo_bridge.py

# Run growth cycle demo (showcasing the new bridge_generate_next_meditation tool)
python demo_growth.py

# Start MCP server
python main.py
```

## Configuration

The bridge can be configured via the `BridgeConfig` class:

```python
from main import BridgeConfig, BridgeEngine

config = BridgeConfig(
    max_traces_per_session=1000,
    saturation_threshold=0.6,
    pause_threshold_ms=300000,  # 5 minutes
    storage_path="/custom/path"
)

bridge = BridgeEngine(config)
```

## Heuristics Details

### Semantic Saturation
Detects when concepts are repeating (Jaccard similarity > threshold)

### Pause Detection
Triggers when user pauses longer than threshold (incubation/thinking time)

### Novelty Drop
Activates when average novelty of recent meditations drops below threshold

### Critique Freshness
Detects when critique feedback becomes repetitive

## Dependencies

- **FastMCP 2.14.1**: High-level MCP server framework
- **NLTK 3.9.2**: Natural language processing utilities
- **Python 3.14+**: Modern Python with dataclasses and type hints

## Testing

Run the comprehensive test suite:

```bash
python test_bridge.py
```

Tests cover:
- NLP utilities and concept extraction
- Insight extraction and novelty calculation
- Mode switch heuristics
- Storage persistence
- Bridge engine integration
- Complete meditation↔critique flow

## License

MIT License - see original mcp-bridge project for details.
