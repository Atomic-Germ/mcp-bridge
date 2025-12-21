#!/usr/bin/env python3
"""
Demo script showing Fast Bridge in action
"""

import time
from main import BridgeEngine, BridgeConfig
import tempfile

def demo_bridge_flow():
    """Demonstrate the complete bridge flow"""
    print("🔄 Fast Bridge Demo - Cognitive Transition Layer")
    print("=" * 50)

    # Create temporary storage
    with tempfile.TemporaryDirectory() as temp_dir:
        config = BridgeConfig(storage_path=temp_dir)
        bridge = BridgeEngine(config)

        # 1. Start session
        print("\n1. Starting new contemplative session...")
        session_id, metrics = bridge.start_session()
        print(f"   Session ID: {session_id}")
        print(f"   Started in mode: {metrics.current_mode}")

        # 2. Log meditation (diverge phase)
        print("\n2. Logging meditation from mcp-creative...")
        emergent_sentence = "Through meditation we discovered coherence synthesis iterate creative density partial causal powers"
        context_words = ["coherence", "synthesis", "creative", "density", "causal", "powers"]

        trace_id, insights, message = bridge.log_meditation(
            emergent_sentence=emergent_sentence,
            context_words=context_words
        )
        print(f"   {message}")
        print(f"   Extracted concepts: {', '.join(insights.extracted_patterns)}")
        print(f"   Novelty score: {insights.novelty:.2f}")

        # 3. Get context for consult
        print("\n3. Preparing context for mcp-consult...")
        system_prompt, user_prompt, concepts, novelty, clusters, context_msg = bridge.get_context_for_consult(trace_id)
        print(f"   {context_msg}")
        print(f"   System prompt prepared with {len(concepts)} concepts")

        # 4. Simulate consult response
        print("\n4. Simulating critique from mcp-consult...")
        consult_response = """This is a profound concept. The 'coherence synthesis' idea has strong potential - it suggests a way to create meaningful connections between disparate elements. The 'creative density' aspect is particularly intriguing, implying a rich concentration of creative potential. The 'partial causal powers' element suggests you're exploring causality in a nuanced way.

The meditation seems to be uncovering fundamental patterns in how creativity and coherence interact. I would suggest exploring how these causal powers might manifest in different domains."""

        consult_trace_id, relevance, relevance_source, consult_msg = bridge.log_consult(
            model="demo-model",
            prompt=user_prompt + " Please critique this creative concept.",
            response=consult_response
        )
        print(f"   {consult_msg}")
        print(f"   Relevance: {relevance:.2f} ({relevance_source})")

        # 5. Get critique feedback for next meditation
        print("\n5. Extracting critique feedback for next meditation...")
        top_concepts, extracted_feedback, provocative_questions, critique_msg = bridge.get_critique_for_meditation(consult_trace_id)
        print(f"   {critique_msg}")
        print(f"   Top feedback concepts: {', '.join(top_concepts)}")
        print("   Provocative questions:")
        for q in provocative_questions[:2]:
            print(f"     • {q}")

        # 5.5. Log a second meditation based on feedback
        print("\n5.5. Logging second meditation with feedback integration...")
        second_emergent = "Exploring causal powers through profound connections suggests synthesis density creative coherence iterate"
        second_context = ["causal", "profound", "connections", "synthesis", "density"]

        second_trace_id, second_insights, second_msg = bridge.log_meditation(
            emergent_sentence=second_emergent,
            context_words=second_context
        )
        print(f"   {second_msg}")
        print(f"   Extracted concepts: {', '.join(second_insights.extracted_patterns)}")

        # 6. Check for mode switch suggestion (now with more traces)
        print("\n6. Checking for mode switch suggestions...")
        suggestion = bridge.suggest_mode_switch()
        if suggestion:
            print(f"   🎯 MODE SWITCH SUGGESTED: {suggestion.suggested_mode.upper()}")
            print(f"   Confidence: {suggestion.confidence:.2f}")
            print(f"   Reason: {suggestion.reason}")
            if "resonance" in suggestion.heuristic_scores:
                print(f"   Resonance-enhanced: coherence {suggestion.heuristic_scores['resonance_coherence']['confidence']:.2f}")
        else:
            print("   No strong mode switch suggestion at this time")

        # 7. Show session trace
        print("\n7. Session trace summary...")
        _, traces, total, trace_msg = bridge.get_session_trace()
        print(f"   {trace_msg}")
        for i, trace in enumerate(traces, 1):
            mode_icon = "🔄" if trace.mode == "diverge" else "🎯"
            if trace.meditation:
                print(f"   {i}. {mode_icon} Meditation: {trace.meditation.emergent_sentence[:60]}...")
            elif trace.critique:
                print(f"   {i}. {mode_icon} Critique: {trace.critique.response[:60]}...")

        print("\n" + "=" * 50)
        print("✅ Demo completed successfully!")
        print("The bridge successfully logged the meditation↔critique cycle")
        print("and extracted insights for seamless cognitive transitions.")

if __name__ == "__main__":
    demo_bridge_flow()