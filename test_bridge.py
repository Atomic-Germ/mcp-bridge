#!/usr/bin/env python3
"""
Test suite for Fast Bridge - MCP Cognitive Bridge
"""

import json
import tempfile
import time
from pathlib import Path
from main import (
    BridgeEngine, BridgeConfig, ContemplativeMemory, SessionMetrics,
    MeditationTrace, MeditationData, Insight, CritiqueData, BridgeMetadata,
    NLPUtils, InsightExtractor, ModeSwitchHeuristics, StorageManager
)

def test_nlp_utils():
    """Test NLP utilities"""
    print("Testing NLP utilities...")

    nlp = NLPUtils()

    # Test tokenization
    tokens = nlp.tokenize("The quick brown fox jumps over the lazy dog")
    assert len(tokens) == 9, f"Expected 9 tokens, got {len(tokens)}"

    # Test keyword extraction
    text = "The creative process involves meditation and critique cycles that help develop ideas"
    keywords = nlp.extract_keywords(text, 5)
    assert len(keywords) <= 5, f"Expected <= 5 keywords, got {len(keywords)}"
    assert "creative" in keywords or "process" in keywords, "Expected key concepts in keywords"

    # Test similarity
    set1 = ["creative", "process", "meditation"]
    set2 = ["creative", "thinking", "meditation"]
    sim = nlp.jaccard_similarity(set1, set2)
    assert sim > 0, "Expected some similarity"

    print("✓ NLP utilities working")

def test_insight_extraction():
    """Test insight extraction"""
    print("Testing insight extraction...")

    nlp = NLPUtils()
    extractor = InsightExtractor(nlp)

    text = "Through meditation we discovered coherence synthesis iterate creative density partial causal powers"
    insights = extractor.extract_insights(text)

    assert len(insights.extracted_patterns) > 0, "Expected extracted patterns"
    assert 0.0 <= insights.novelty <= 1.0, f"Novelty should be 0-1, got {insights.novelty}"
    assert insights.extracted_at > 0, "Expected extraction timestamp"

    print("✓ Insight extraction working")

def test_mode_switch_heuristics():
    """Test mode switch heuristics"""
    print("Testing mode switch heuristics...")

    nlp = NLPUtils()
    heuristics = ModeSwitchHeuristics(nlp)

    # Create mock memory
    memory = ContemplativeMemory(
        session_id="test-session",
        started_at=time.time(),
        metrics=SessionMetrics(current_mode="diverge")
    )

    # Test with minimal data
    saturation = heuristics.semantic_saturation_detector(memory)
    assert not saturation.triggered, "Should not trigger with minimal data"

    # Add some traces
    trace1 = MeditationTrace(
        id="1",
        timestamp=time.time(),
        mode="diverge",
        insights=Insight(
            extracted_patterns=["creative", "process", "meditation"],
            novelty=0.8,
            extracted_at=time.time()
        )
    )

    trace2 = MeditationTrace(
        id="2",
        timestamp=time.time() + 1,
        mode="diverge",
        insights=Insight(
            extracted_patterns=["creative", "thinking", "meditation"],
            novelty=0.6,
            extracted_at=time.time() + 1
        )
    )

    memory.traces = [trace1, trace2]

    saturation = heuristics.semantic_saturation_detector(memory)
    assert saturation.confidence >= 0, "Should have some confidence"

    print("✓ Mode switch heuristics working")

def test_storage_manager():
    """Test storage management"""
    print("Testing storage manager...")

    with tempfile.TemporaryDirectory() as temp_dir:
        storage = StorageManager(temp_dir)

        # Create test memory
        memory = ContemplativeMemory(
            session_id="test-storage",
            started_at=time.time(),
            metrics=SessionMetrics(current_mode="diverge")
        )

        # Add a trace
        trace = MeditationTrace(
            id="test-trace",
            timestamp=time.time(),
            mode="diverge",
            meditation=MeditationData(
                context_words=["creative", "meditation"],
                emergent_sentence="Through meditation we create coherence"
            ),
            insights=Insight(
                extracted_patterns=["coherence", "meditation"],
                novelty=0.9,
                extracted_at=time.time()
            )
        )
        memory.traces = [trace]

        # Save and load
        storage.save_session(memory)
        loaded = storage.load_session("test-storage")

        assert loaded is not None, "Should load memory"
        assert loaded.session_id == "test-storage", "Session ID should match"
        assert len(loaded.traces) == 1, "Should have one trace"
        assert loaded.traces[0].meditation.emergent_sentence == "Through meditation we create coherence"

    print("✓ Storage manager working")

def test_bridge_engine():
    """Test the main bridge engine"""
    print("Testing bridge engine...")

    with tempfile.TemporaryDirectory() as temp_dir:
        config = BridgeConfig(storage_path=temp_dir)
        engine = BridgeEngine(config)

        # Start session
        session_id, metrics = engine.start_session()
        assert session_id, "Should get session ID"
        assert metrics.current_mode == "diverge", "Should start in diverge mode"

        # Log meditation
        trace_id, insights, message = engine.log_meditation(
            emergent_sentence="Through meditation we discovered coherence synthesis",
            context_words=["creative", "coherence", "synthesis"]
        )
        assert trace_id, "Should get trace ID"
        assert len(insights.extracted_patterns) > 0, "Should extract patterns"

        # Log consult
        consult_trace_id, relevance, relevance_source, consult_message = engine.log_consult(
            model="test-model",
            prompt="What do you think of this idea?",
            response="This is a fascinating concept with great potential"
        )
        assert consult_trace_id, "Should get consult trace ID"
        assert 0.0 <= relevance <= 1.0, "Relevance should be 0-1"

        # Test context extraction
        system_prompt, user_prompt, concepts, novelty, clusters, context_message = engine.get_context_for_consult(trace_id)
        assert "creative" in system_prompt.lower() or "coherence" in system_prompt.lower(), "Should include concepts in system prompt"

        # Test critique extraction
        top_concepts, extracted_feedback, provocative_questions, critique_message = engine.get_critique_for_meditation(consult_trace_id)
        assert len(top_concepts) > 0, "Should extract feedback concepts"

        # Test session trace
        target_session_id, traces, total_traces, trace_message = engine.get_session_trace()
        assert len(traces) == 2, "Should have 2 traces"
        assert total_traces == 2, "Should have total of 2 traces"

        # Test mode switch suggestion
        suggestion = engine.suggest_mode_switch()
        # May or may not have suggestion depending on heuristics

        # Test resume session
        resumed_metrics, resume_message = engine.resume_session(session_id)
        assert resumed_metrics.current_mode == "converge", "Should resume in last mode"

    print("✓ Bridge engine working")

def test_integration_flow():
    """Test complete integration flow"""
    print("Testing integration flow...")

    with tempfile.TemporaryDirectory() as temp_dir:
        config = BridgeConfig(storage_path=temp_dir)
        engine = BridgeEngine(config)

        # 1. Start session
        session_id, _ = engine.start_session()
        print(f"Started session: {session_id}")

        # 2. Log meditation
        trace_id, insights, _ = engine.log_meditation(
            emergent_sentence="Through meditation we generate coherence synthesis iterate creative density",
            context_words=["coherence", "synthesis", "creative", "density"]
        )
        print(f"Logged meditation with {len(insights.extracted_patterns)} concepts")

        # 3. Get context for consult
        system_prompt, user_prompt, concepts, novelty, clusters, _ = engine.get_context_for_consult(trace_id)
        print(f"Prepared consult context with novelty {novelty:.2f}")

        # 4. Simulate consult response
        consult_response = "This concept shows great promise. The synthesis aspect is particularly interesting, and the creative density could lead to breakthrough insights."

        # 5. Log consult
        consult_trace_id, relevance, _, _ = engine.log_consult(
            model="test-model",
            prompt=user_prompt + " " + consult_response,
            response=consult_response
        )
        print(f"Logged consult with relevance {relevance:.2f}")

        # 6. Get critique for next meditation
        top_concepts, _, provocative_questions, _ = engine.get_critique_for_meditation(consult_trace_id)
        print(f"Extracted {len(top_concepts)} feedback concepts")
        print(f"Provocative questions: {provocative_questions[:2]}")

        # 7. Check for mode switch suggestion
        suggestion = engine.suggest_mode_switch()
        if suggestion:
            print(f"Mode switch suggestion: {suggestion.suggested_mode} (confidence: {suggestion.confidence:.2f})")
        else:
            print("No mode switch suggestion at this time")

        # 8. Get session trace
        _, traces, total, _ = engine.get_session_trace()
        print(f"Session has {total} total traces")

        print("✓ Integration flow completed successfully")

def run_all_tests():
    """Run all tests"""
    print("Running Fast Bridge tests...\n")

    try:
        test_nlp_utils()
        test_insight_extraction()
        test_mode_switch_heuristics()
        test_storage_manager()
        test_bridge_engine()
        test_integration_flow()

        print("\n🎉 All tests passed! Fast Bridge is ready.")

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)