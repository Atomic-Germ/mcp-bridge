#!/usr/bin/env python3
"""
Demo script showing the new bridge_generate_next_meditation tool in action.
This demonstrates how critique feedback transforms into creative inspiration.
"""

from main import bridge

def demo_growth_cycle():
    """Demonstrate the complete growth cycle with the new tool"""
    print("🌱 Fast Bridge - Growth Through Feedback Demo")
    print("=" * 50)

    # Step 1: Start session
    print("\n1. Starting new contemplative session...")
    session_id, metrics = bridge.start_session()
    print(f"   Session ID: {session_id}")

    # Step 2: Log initial meditation
    print("\n2. Logging initial creative meditation...")
    emergent_sentence = "consciousness flows through patterns of creative emergence and transformation"
    context_words = ["consciousness", "patterns", "emergence", "creativity", "transformation"]

    meditation_trace_id, insights, message = bridge.log_meditation(
        emergent_sentence=emergent_sentence,
        context_words=context_words
    )
    print(f"   {message}")
    print(f"   Extracted concepts: {insights.extracted_patterns}")
    print(f"   Novelty score: {insights.novelty:.2f}")

    # Step 3: Prepare and log critique
    print("\n3. Preparing context for critique...")
    system_prompt, user_prompt, concepts, novelty, clusters, message = bridge.get_context_for_consult(meditation_trace_id)
    print(f"   {message}")

    # Simulate critique response
    critique_response = """This meditation reveals a profound synthesis of consciousness and creativity. The emergence of patterns through transformation suggests a dynamic framework with significant potential.

Strengths:
- Successfully connects consciousness with creative processes
- Recognizes transformation as key to emergence
- Suggests patterns emerge from flow states

Challenges:
- How to measure or quantify emergence?
- What triggers transformation vs. stagnation?
- Potential for infinite regress in pattern analysis

Suggestions:
- Consider feedback loops between consciousness and creativity
- Explore constraints that enable rather than limit transformation
- Investigate how patterns function as bridges between states

This framework has strong potential for understanding creative cognition and consciousness studies."""

    print("\n4. Logging critique response...")
    critique_trace_id, relevance, relevance_source, message = bridge.log_consult(
        model="llama2",
        prompt=user_prompt,
        response=critique_response
    )
    print(f"   {message} ({relevance_source})")

    # Step 4: Extract feedback for next meditation
    print("\n5. Extracting critique feedback...")
    top_concepts, extracted_feedback, provocative_questions, message = bridge.get_critique_for_meditation(critique_trace_id)
    print(f"   {message}")
    print(f"   Top feedback concepts: {top_concepts}")
    print("   Provocative questions:")
    for i, question in enumerate(provocative_questions, 1):
        print(f"     {i}. {question}")

    # Step 5: Generate next meditation suggestions (THE NEW TOOL!)
    print("\n6. 🎉 Generating next meditation suggestions...")
    print("   (This is the new bridge_generate_next_meditation tool!)")

    suggestions, rationale, message = bridge.generate_next_meditation(
        consult_trace_id=critique_trace_id,
        creativity_level=0.7,  # Balanced creativity
        num_suggestions=3
    )

    print(f"\n   {message}")
    print(f"   Overall Rationale: {rationale}")

    print("\n   📝 Generated Meditation Suggestions:")
    for i, suggestion in enumerate(suggestions, 1):
        print(f"\n     Suggestion {i}:")
        print(f"       Context Words: {', '.join(suggestion['context_words'])}")
        print(f"       Creative Focus: {suggestion['creative_focus']}")
        print(f"       Confidence: {suggestion['confidence']:.2f}")
        print(f"       Creativity Level: {suggestion['creativity_level']:.1f}")

    # Step 6: Show session trace
    print("\n7. Session evolution summary...")
    target_session_id, traces, total_traces, message = bridge.get_session_trace()
    print(f"   {message}")
    for i, trace in enumerate(traces, 1):
        mode_icon = "🔄" if trace.mode == "diverge" else "🎯"
        if trace.meditation:
            print(f"   {mode_icon} Trace {i}: Meditation - {len(trace.insights.extracted_patterns) if trace.insights else 0} concepts")
        elif trace.critique:
            print(f"   {mode_icon} Trace {i}: Critique - relevance {trace.critique.relevance:.2f}")

    print("\n🎨 Growth Cycle Complete!")
    print("The critique has been transformed into creative inspiration,")
    print("enabling thoughts to grow through the feedback loop.")
    print("\n💡 Key Insight: This tool represents the 'missing factor' that")
    print("allows thoughts to *grow* by turning analysis into generation.")

if __name__ == "__main__":
    demo_growth_cycle()