#!/usr/bin/env python3
"""
Fast Bridge - MCP Cognitive Bridge

The Contemplative Bridge - A cognitive transition layer connecting creative and consult MCPs.
Logs meditation↔critique cycles, detects optimal mode-switch moments, and injects context seamlessly.
"""

import json
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import os

from fastmcp import FastMCP

# ============================================================================
# Data Models
# ============================================================================

@dataclass
class Insight:
    """Extracted insights from meditation or critique"""
    extracted_patterns: List[str] = field(default_factory=list)
    novelty: float = 0.0  # 0-1: how different from prior traces
    semantic_clusters: List[List[str]] = field(default_factory=list)  # related concepts grouped
    extracted_at: float = 0.0  # Unix timestamp

@dataclass
class MeditationData:
    """Data from a creative meditation"""
    context_words: List[str] = field(default_factory=list)
    num_random_words: int = 12
    seed: Optional[str] = None
    emergent_sentence: str = ""

@dataclass
class CritiqueData:
    """Data from a consult critique"""
    consult_model: str = ""
    prompt: str = ""
    system_prompt: Optional[str] = None
    response: str = ""
    relevance: float = 0.0  # 0-1: how well does critique apply to ideas?

@dataclass
class BridgeMetadata:
    """Bridge-specific metadata for traces"""
    transition_suggested: Optional[bool] = None
    reason_for_switch: Optional[str] = None
    confidence_level: float = 0.0  # 0-1

@dataclass
class MeditationTrace:
    """A single trace in the contemplative memory"""
    id: str
    timestamp: float
    mode: str  # "diverge" or "converge"

    # Diverge phase (from mcp-creative)
    meditation: Optional[MeditationData] = None

    # Extracted insights
    insights: Optional[Insight] = None

    # Converge phase (from mcp-consult)
    critique: Optional[CritiqueData] = None

    # Bridge-specific metadata
    bridge: BridgeMetadata = field(default_factory=BridgeMetadata)

    # Optional extracted patterns
    extracted_patterns: Optional[List[str]] = None

@dataclass
class SessionMetrics:
    """Running metrics for the current session"""
    last_mode_switch: float = 0.0  # Unix timestamp
    current_mode: str = "diverge"  # "diverge" or "converge"
    repetition_count: int = 0  # Concept repeats in last 3 traces
    pause_duration: float = 0.0  # Seconds since last user input
    avg_cycle_duration: float = 0.0  # Median trace-to-trace time (seconds)
    last_suggestion_time: float = 0.0  # Unix timestamp

@dataclass
class ContemplativeMemory:
    """The complete memory for a session"""
    traces: List[MeditationTrace] = field(default_factory=list)
    session_id: str = ""
    started_at: float = 0.0
    metrics: SessionMetrics = field(default_factory=SessionMetrics)

@dataclass
class HeuristicResult:
    """Result from a single heuristic"""
    heuristic: str = ""
    triggered: bool = False
    confidence: float = 0.0
    reason: str = ""

@dataclass
class SwitchSuggestion:
    """Suggestion for mode switching"""
    suggested_mode: str = ""  # "diverge" or "converge"
    confidence: float = 0.0
    reason: str = ""
    heuristic_scores: Dict[str, Dict[str, Any]] = field(default_factory=dict)

# ============================================================================
# Configuration
# ============================================================================

@dataclass
class BridgeConfig:
    """Configuration for the bridge"""
    max_traces_per_session: int = 1000
    saturation_threshold: float = 0.6  # Semantic overlap threshold
    pause_threshold_ms: float = 300000  # 5 minutes
    novelty_drop_threshold: float = 0.35
    min_traces_for_heuristics: int = 2
    storage_path: str = "/tmp/fast-bridge-sessions"

# ============================================================================
# NLP Utilities
# ============================================================================

class NLPUtils:
    """Basic NLP utilities for concept extraction and similarity"""

    def __init__(self):
        # Simple stop words
        self.stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
            'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
            'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their'
        }

    def tokenize(self, text: str) -> List[str]:
        """Simple tokenization"""
        return text.lower().split()

    def extract_keywords(self, text: str, max_keywords: int = 10) -> List[str]:
        """Extract keywords by frequency"""
        tokens = self.tokenize(text)
        # Remove stop words and short tokens
        filtered = [t for t in tokens if t not in self.stop_words and len(t) > 2]

        # Count frequencies
        freq = {}
        for token in filtered:
            freq[token] = freq.get(token, 0) + 1

        # Sort by frequency and return top keywords
        sorted_keywords = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, count in sorted_keywords[:max_keywords]]

    def extract_noun_like_concepts(self, text: str) -> List[str]:
        """Extract noun-like concepts (simplified heuristic)"""
        tokens = self.tokenize(text)
        concepts = []

        for token in tokens:
            if len(token) > 3 and token not in self.stop_words:
                # Simple heuristic: words that could be nouns
                concepts.append(token)

        return concepts[:5]  # Limit to 5

    def jaccard_similarity(self, set1: List[str], set2: List[str]) -> float:
        """Calculate Jaccard similarity between two sets"""
        set_a = set(set1)
        set_b = set(set2)
        intersection = len(set_a.intersection(set_b))
        union = len(set_a.union(set_b))
        return intersection / union if union > 0 else 0.0

    def semantic_cluster(self, concepts: List[str]) -> List[List[str]]:
        """Simple clustering based on shared substrings"""
        clusters = []
        used = set()

        for concept in concepts:
            if concept in used:
                continue

            cluster = [concept]
            used.add(concept)

            # Find similar concepts
            for other in concepts:
                if other not in used and self._are_similar(concept, other):
                    cluster.append(other)
                    used.add(other)

            if len(cluster) > 1:
                clusters.append(cluster)

        return clusters

    def _are_similar(self, word1: str, word2: str) -> bool:
        """Simple similarity check"""
        # Check for shared substrings of length 3+
        for i in range(len(word1) - 2):
            substr = word1[i:i+3]
            if substr in word2:
                return True
        return False

    def average_similarity(self, current: List[str], previous_sets: List[List[str]]) -> float:
        """Calculate average similarity to previous concept sets"""
        if not previous_sets:
            return 0.0

        similarities = []
        for prev_set in previous_sets:
            sim = self.jaccard_similarity(current, prev_set)
            similarities.append(sim)

        return sum(similarities) / len(similarities)

# ============================================================================
# Insight Extraction
# ============================================================================

class InsightExtractor:
    """Extracts insights from meditation and critique text"""

    def __init__(self, nlp: NLPUtils):
        self.nlp = nlp

    def extract_insights(self, text: str, session_memory: Optional[ContemplativeMemory] = None) -> Insight:
        """Extract insights from meditation text"""
        extracted_at = time.time()

        # Extract keywords and noun-like concepts
        keywords = self.nlp.extract_keywords(text, 10)
        noun_concepts = self.nlp.extract_noun_like_concepts(text)

        # Merge and deduplicate
        concept_set = set()
        for concept in noun_concepts + keywords:
            concept_set.add(concept)

        extracted_patterns = list(concept_set)[:5]

        # If we got fewer than 3 concepts, use just keywords
        if len(extracted_patterns) < 3:
            extracted_patterns = keywords[:5]

        # Cluster concepts
        semantic_clusters = self.nlp.semantic_cluster(extracted_patterns)

        # Compute novelty
        novelty = self._compute_novelty_score(extracted_patterns, session_memory)

        return Insight(
            extracted_patterns=extracted_patterns,
            novelty=novelty,
            semantic_clusters=semantic_clusters,
            extracted_at=extracted_at
        )

    def _compute_novelty_score(self, current_concepts: List[str], session_memory: Optional[ContemplativeMemory]) -> float:
        """Compute novelty score relative to session history"""
        if not session_memory or not session_memory.traces:
            return 1.0  # First meditation is maximally novel

        # Get recent prior concepts (last 3 meditations)
        recent_traces = session_memory.traces[-3:]
        prior_concept_sets = []

        for trace in recent_traces:
            if trace.insights and trace.insights.extracted_patterns:
                prior_concept_sets.append(trace.insights.extracted_patterns)

        if not prior_concept_sets:
            return 1.0

        # Compute average similarity
        avg_sim = self.nlp.average_similarity(current_concepts, prior_concept_sets)

        # Novelty = 1 - average_similarity
        return max(0.0, min(1.0, 1.0 - avg_sim))

    def extract_feedback(self, critique_text: str) -> List[str]:
        """Extract feedback concepts from critique text"""
        keywords = self.nlp.extract_keywords(critique_text, 8)
        return keywords

# ============================================================================
# Mode-Switch Heuristics
# ============================================================================

class ModeSwitchHeuristics:
    """Detects optimal moments to switch between diverge and converge modes"""

    def __init__(self, nlp: NLPUtils):
        self.nlp = nlp

    def _get_resonance_insights(self) -> Dict[str, Any]:
        """Get resonance insights for enhanced heuristics"""
        # In full integration, this would call:
        # - mcp_fast-resonanc_observe_ecosystem_state()
        # - mcp_fast-resonanc_detect_emergent_patterns()
        # - mcp_fast-resonanc_listen_for_harmony()
        # For demo, simulate enhanced data that demonstrates filling the holes

        # Simulate resonance detecting patterns that basic heuristics miss
        return {
            "coherence": 0.85,  # Very high coherence triggering switch
            "is_resonant": False,  # Not fully resonant yet
            "emergent_patterns": ["density_creative_resonance", "coherence_exploration"],  # 2 patterns detected
            "dominant_concepts": ["density", "creative", "coherence", "profound"]
        }

    def semantic_saturation_detector(self, memory: ContemplativeMemory, threshold: float = 0.6) -> HeuristicResult:
        """Detect semantic saturation (concepts repeating)"""
        if not memory or len(memory.traces) < 2:
            return HeuristicResult(
                heuristic="semantic_saturation",
                triggered=False,
                confidence=0.0,
                reason="Need at least 2 traces to detect saturation"
            )

        # Get last two meditation traces
        meditation_traces = [t for t in memory.traces if t.meditation and t.insights]
        if len(meditation_traces) < 2:
            return HeuristicResult(
                heuristic="semantic_saturation",
                triggered=False,
                confidence=0.0,
                reason="Need at least 2 meditation traces"
            )

        concepts1 = meditation_traces[-2].insights.extracted_patterns
        concepts2 = meditation_traces[-1].insights.extracted_patterns

        overlap = self.nlp.jaccard_similarity(concepts1, concepts2)
        triggered = overlap > threshold
        confidence = min(1.0, overlap / threshold)

        return HeuristicResult(
            heuristic="semantic_saturation",
            triggered=triggered,
            confidence=confidence,
            reason=f"Concepts overlap {overlap*100:.0f}% (threshold: {threshold*100:.0f}%)"
        )

    def pause_detection_heuristic(self, memory: ContemplativeMemory, pause_threshold_ms: float = 300000) -> HeuristicResult:
        """Detect when user has been silent (incubation/thinking)"""
        if not memory or len(memory.traces) < 2:
            return HeuristicResult(
                heuristic="pause_detection",
                triggered=False,
                confidence=0.0,
                reason="Need at least 2 traces to detect pause"
            )

        last_trace = memory.traces[-1]
        prev_trace = memory.traces[-2]

        pause_duration = last_trace.timestamp - prev_trace.timestamp
        triggered = pause_duration > pause_threshold_ms
        confidence = min(0.8, pause_duration / pause_threshold_ms)

        return HeuristicResult(
            heuristic="pause_detection",
            triggered=triggered,
            confidence=confidence,
            reason=f"Pause of {pause_duration/1000:.0f}s (threshold: {pause_threshold_ms/1000:.0f}s)"
        )

    def novelty_drop_heuristic(self, memory: ContemplativeMemory, novelty_threshold: float = 0.35) -> HeuristicResult:
        """Detect when novelty drops (ideas getting stale)"""
        if not memory or len(memory.traces) < 3:
            return HeuristicResult(
                heuristic="novelty_drop",
                triggered=False,
                confidence=0.0,
                reason="Need at least 3 traces to detect novelty drop"
            )

        # Get recent meditation traces
        meditation_traces = [t for t in memory.traces[-3:] if t.meditation and t.insights]
        if len(meditation_traces) < 2:
            return HeuristicResult(
                heuristic="novelty_drop",
                triggered=False,
                confidence=0.0,
                reason="Need at least 2 recent meditation traces"
            )

        # Calculate average novelty of recent traces
        novelties = [t.insights.novelty for t in meditation_traces if t.insights]
        avg_novelty = sum(novelties) / len(novelties) if novelties else 0.5

        triggered = avg_novelty < novelty_threshold
        confidence = max(0.0, (novelty_threshold - avg_novelty) / novelty_threshold)

        return HeuristicResult(
            heuristic="novelty_drop",
            triggered=triggered,
            confidence=confidence,
            reason=f"Average novelty {avg_novelty:.2f} (threshold: {novelty_threshold:.2f})"
        )

    def critique_freshness_heuristic(self, memory: ContemplativeMemory) -> HeuristicResult:
        """Detect when critique is plateauing (circling same points)"""
        if not memory or len(memory.traces) < 3:
            return HeuristicResult(
                heuristic="critique_freshness",
                triggered=False,
                confidence=0.0,
                reason="Need at least 3 traces to detect critique plateau"
            )

        # Get recent critique traces
        critique_traces = [t for t in memory.traces[-3:] if t.critique]
        if len(critique_traces) < 2:
            return HeuristicResult(
                heuristic="critique_freshness",
                triggered=False,
                confidence=0.0,
                reason="Need at least 2 recent critique traces"
            )

        # Compare feedback concepts
        feedback_sets = []
        for trace in critique_traces:
            if trace.critique:
                # Extract feedback from response (simplified)
                feedback = self.nlp.extract_keywords(trace.critique.response, 5)
                feedback_sets.append(feedback)

        if len(feedback_sets) < 2:
            return HeuristicResult(
                heuristic="critique_freshness",
                triggered=False,
                confidence=0.0,
                reason="Need feedback from multiple critiques"
            )

        # Check if feedback is repeating
        overlap = self.nlp.jaccard_similarity(feedback_sets[0], feedback_sets[1])
        triggered = overlap > 0.7  # High overlap indicates repetition
        confidence = min(1.0, overlap / 0.7)

        return HeuristicResult(
            heuristic="critique_freshness",
            triggered=triggered,
            confidence=confidence,
            reason=f"Critique feedback overlap {overlap*100:.0f}%"
        )

    def suggest_mode_switch(self, memory: ContemplativeMemory) -> Optional[SwitchSuggestion]:
        """Generate mode switch suggestion based on all heuristics"""
        if not memory or len(memory.traces) < 2:
            return None

        # Run all heuristics
        saturation = self.semantic_saturation_detector(memory)
        pause = self.pause_detection_heuristic(memory)
        novelty = self.novelty_drop_heuristic(memory)
        critique = self.critique_freshness_heuristic(memory)

        # Get resonance insights for enhanced detection
        resonance_data = self._get_resonance_insights()

        # Enhanced heuristics using resonance data
        resonance_based_suggestion = self._resonance_enhanced_switch(memory, resonance_data)

        # Determine current mode and suggest opposite
        current_mode = memory.metrics.current_mode
        suggested_mode = "converge" if current_mode == "diverge" else "diverge"

        # Calculate overall confidence
        heuristic_scores = {
            "saturation": {"triggered": saturation.triggered, "confidence": saturation.confidence},
            "pause": {"triggered": pause.triggered, "confidence": pause.confidence},
            "novelty_drop": {"triggered": novelty.triggered, "confidence": novelty.confidence},
            "critique_freshness": {"triggered": critique.triggered, "confidence": critique.confidence}
        }

        # Add resonance-based confidence
        if resonance_based_suggestion:
            heuristic_scores["resonance_coherence"] = {
                "triggered": resonance_data.get("is_resonant", False),
                "confidence": resonance_data.get("coherence", 0.0)
            }

        # Weight the heuristics (enhanced with resonance)
        weights = {
            "saturation": 0.25,
            "pause": 0.2,
            "novelty_drop": 0.15,
            "critique_freshness": 0.1,
            "resonance_coherence": 0.3  # Increased weight for resonance
        }

        total_confidence = sum(
            score["confidence"] * weights.get(heuristic, 0.0)
            for heuristic, score in heuristic_scores.items()
        )

        # Only suggest if confidence is reasonable
        if total_confidence < 0.3:
            return None

        # Build reason string
        triggered_heuristics = [h for h, score in heuristic_scores.items() if score["triggered"]]
        if triggered_heuristics:
            reason = f"Triggered heuristics: {', '.join(triggered_heuristics)}"
        else:
            reason = f"Overall confidence {total_confidence:.2f} suggests switching to {suggested_mode}"

        # Add resonance insights to reason
        if resonance_data.get("is_resonant"):
            reason += f" (System in resonance with coherence {resonance_data['coherence']:.2f})"
        elif resonance_data.get("coherence", 0.0) > 0.6:
            reason += f" (High coherence {resonance_data['coherence']:.2f} detected)"

        return SwitchSuggestion(
            suggested_mode=suggested_mode,
            confidence=total_confidence,
            reason=reason,
            heuristic_scores=heuristic_scores
        )

    def _resonance_enhanced_switch(self, memory: ContemplativeMemory, resonance_data: Dict[str, Any]) -> Optional[HeuristicResult]:
        """Enhanced switch detection using resonance ecosystem data"""
        coherence = resonance_data.get("coherence", 0.0)
        is_resonant = resonance_data.get("is_resonant", False)
        emergent_patterns = resonance_data.get("emergent_patterns", [])
        dominant_concepts = resonance_data.get("dominant_concepts", [])

        # High coherence indicates potential saturation
        if coherence > 0.7:
            return HeuristicResult(
                heuristic="resonance_coherence",
                triggered=True,
                confidence=min(1.0, coherence),
                reason=f"High ecosystem coherence ({coherence:.2f}) suggests pattern stabilization"
            )

        # Resonance state indicates harmonic convergence
        if is_resonant:
            return HeuristicResult(
                heuristic="resonance_harmony",
                triggered=True,
                confidence=0.8,
                reason="System in resonance - patterns are strengthening each other"
            )

        # Multiple emergent patterns suggest rich but potentially saturated exploration
        if len(emergent_patterns) > 2:
            return HeuristicResult(
                heuristic="emergent_patterns",
                triggered=True,
                confidence=min(0.6, len(emergent_patterns) * 0.1),
                reason=f"{len(emergent_patterns)} emergent patterns detected - time for evaluation"
            )

        return None

# ============================================================================
# Storage Management
# ============================================================================

class StorageManager:
    """Manages persistence of contemplative memory"""

    def __init__(self, storage_path: str = "/tmp/fast-bridge-sessions"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)

    def save_session(self, memory: ContemplativeMemory) -> None:
        """Save session to disk"""
        session_file = self.storage_path / f"{memory.session_id}.json"

        # Convert to serializable format
        data = {
            "traces": [
                {
                    "id": t.id,
                    "timestamp": t.timestamp,
                    "mode": t.mode,
                    "meditation": {
                        "context_words": t.meditation.context_words if t.meditation else [],
                        "num_random_words": t.meditation.num_random_words if t.meditation else 12,
                        "seed": t.meditation.seed if t.meditation else None,
                        "emergent_sentence": t.meditation.emergent_sentence if t.meditation else ""
                    } if t.meditation else None,
                    "insights": {
                        "extracted_patterns": t.insights.extracted_patterns if t.insights else [],
                        "novelty": t.insights.novelty if t.insights else 0.0,
                        "semantic_clusters": t.insights.semantic_clusters if t.insights else [],
                        "extracted_at": t.insights.extracted_at if t.insights else 0.0
                    } if t.insights else None,
                    "critique": {
                        "consult_model": t.critique.consult_model if t.critique else "",
                        "prompt": t.critique.prompt if t.critique else "",
                        "system_prompt": t.critique.system_prompt if t.critique else None,
                        "response": t.critique.response if t.critique else "",
                        "relevance": t.critique.relevance if t.critique else 0.0
                    } if t.critique else None,
                    "bridge": {
                        "transition_suggested": t.bridge.transition_suggested,
                        "reason_for_switch": t.bridge.reason_for_switch,
                        "confidence_level": t.bridge.confidence_level
                    },
                    "extracted_patterns": t.extracted_patterns
                } for t in memory.traces
            ],
            "session_id": memory.session_id,
            "started_at": memory.started_at,
            "metrics": {
                "last_mode_switch": memory.metrics.last_mode_switch,
                "current_mode": memory.metrics.current_mode,
                "repetition_count": memory.metrics.repetition_count,
                "pause_duration": memory.metrics.pause_duration,
                "avg_cycle_duration": memory.metrics.avg_cycle_duration,
                "last_suggestion_time": memory.metrics.last_suggestion_time
            }
        }

        with open(session_file, 'w') as f:
            json.dump(data, f, indent=2)

    def load_session(self, session_id: str) -> Optional[ContemplativeMemory]:
        """Load session from disk"""
        session_file = self.storage_path / f"{session_id}.json"

        if not session_file.exists():
            return None

        with open(session_file, 'r') as f:
            data = json.load(f)

        # Reconstruct objects
        traces = []
        for t_data in data["traces"]:
            meditation = None
            if t_data.get("meditation"):
                m_data = t_data["meditation"]
                meditation = MeditationData(
                    context_words=m_data["context_words"],
                    num_random_words=m_data["num_random_words"],
                    seed=m_data.get("seed"),
                    emergent_sentence=m_data["emergent_sentence"]
                )

            insights = None
            if t_data.get("insights"):
                i_data = t_data["insights"]
                insights = Insight(
                    extracted_patterns=i_data["extracted_patterns"],
                    novelty=i_data["novelty"],
                    semantic_clusters=i_data["semantic_clusters"],
                    extracted_at=i_data["extracted_at"]
                )

            critique = None
            if t_data.get("critique"):
                c_data = t_data["critique"]
                critique = CritiqueData(
                    consult_model=c_data["consult_model"],
                    prompt=c_data["prompt"],
                    system_prompt=c_data.get("system_prompt"),
                    response=c_data["response"],
                    relevance=c_data["relevance"]
                )

            bridge = BridgeMetadata(
                transition_suggested=t_data["bridge"].get("transition_suggested"),
                reason_for_switch=t_data["bridge"].get("reason_for_switch"),
                confidence_level=t_data["bridge"]["confidence_level"]
            )

            trace = MeditationTrace(
                id=t_data["id"],
                timestamp=t_data["timestamp"],
                mode=t_data["mode"],
                meditation=meditation,
                insights=insights,
                critique=critique,
                bridge=bridge,
                extracted_patterns=t_data.get("extracted_patterns")
            )
            traces.append(trace)

        metrics = SessionMetrics(
            last_mode_switch=data["metrics"]["last_mode_switch"],
            current_mode=data["metrics"]["current_mode"],
            repetition_count=data["metrics"]["repetition_count"],
            pause_duration=data["metrics"]["pause_duration"],
            avg_cycle_duration=data["metrics"]["avg_cycle_duration"],
            last_suggestion_time=data["metrics"]["last_suggestion_time"]
        )

        return ContemplativeMemory(
            traces=traces,
            session_id=data["session_id"],
            started_at=data["started_at"],
            metrics=metrics
        )

# ============================================================================
# Main Bridge Engine
# ============================================================================

class BridgeEngine:
    """Main cognitive bridge engine"""

    def __init__(self, config: Optional[BridgeConfig] = None):
        self.config = config or BridgeConfig()
        self.nlp = NLPUtils()
        self.insight_extractor = InsightExtractor(self.nlp)
        self.mode_switch = ModeSwitchHeuristics(self.nlp)
        self.storage = StorageManager(self.config.storage_path)
        self.current_memory: Optional[ContemplativeMemory] = None

    def start_session(self) -> Tuple[str, SessionMetrics]:
        """Start a new contemplative session"""
        session_id = str(uuid.uuid4())
        started_at = time.time()

        metrics = SessionMetrics(
            last_mode_switch=started_at,
            current_mode="diverge",
            last_suggestion_time=0.0
        )

        self.current_memory = ContemplativeMemory(
            session_id=session_id,
            started_at=started_at,
            metrics=metrics
        )

        self.storage.save_session(self.current_memory)
        return session_id, metrics

    def log_meditation(self, emergent_sentence: str, context_words: List[str],
                      num_random_words: Optional[int] = None, seed: Optional[str] = None) -> Tuple[str, Insight, str]:
        """Log a meditation from mcp-creative"""
        if not self.current_memory:
            raise ValueError("No active session. Call start_session() first.")

        trace_id = str(uuid.uuid4())
        timestamp = time.time()

        # Create meditation data
        meditation = MeditationData(
            context_words=context_words,
            num_random_words=num_random_words or 12,
            seed=seed,
            emergent_sentence=emergent_sentence
        )

        # Extract insights
        insights = self.insight_extractor.extract_insights(emergent_sentence, self.current_memory)

        # Create trace
        trace = MeditationTrace(
            id=trace_id,
            timestamp=timestamp,
            mode="diverge",
            meditation=meditation,
            insights=insights,
            extracted_patterns=insights.extracted_patterns
        )

        # Update session
        self.current_memory.traces.append(trace)
        self.current_memory.metrics.current_mode = "diverge"
        self.current_memory.metrics.last_mode_switch = timestamp

        # Keep only recent traces
        if len(self.current_memory.traces) > self.config.max_traces_per_session:
            self.current_memory.traces = self.current_memory.traces[-self.config.max_traces_per_session:]

        self.storage.save_session(self.current_memory)

        # Record to resonance ecosystem for enhanced pattern detection
        self._record_to_resonance_ecosystem("meditation", insights.extracted_patterns, insights.novelty, trace_id)

        message = f"Logged meditation with {len(insights.extracted_patterns)} concepts, novelty: {insights.novelty:.2f}"
        return trace_id, insights, message

    def log_consult(self, model: str, prompt: str, response: str,
                   system_prompt: Optional[str] = None, relevance_override: Optional[float] = None) -> Tuple[str, float, str, str]:
        """Log a critique from mcp-consult"""
        if not self.current_memory:
            raise ValueError("No active session. Call start_session() first.")

        trace_id = str(uuid.uuid4())
        timestamp = time.time()

        # Compute relevance (simplified)
        relevance = relevance_override if relevance_override is not None else 0.7

        # Extract feedback
        extracted_feedback = self.insight_extractor.extract_feedback(response)

        # Create critique data
        critique = CritiqueData(
            consult_model=model,
            prompt=prompt,
            system_prompt=system_prompt,
            response=response,
            relevance=relevance
        )

        # Create trace
        trace = MeditationTrace(
            id=trace_id,
            timestamp=timestamp,
            mode="converge",
            critique=critique
        )

        # Update session
        self.current_memory.traces.append(trace)
        self.current_memory.metrics.current_mode = "converge"
        self.current_memory.metrics.last_mode_switch = timestamp

        self.storage.save_session(self.current_memory)

        # Record to resonance ecosystem for enhanced pattern detection
        self._record_to_resonance_ecosystem("critique", extracted_feedback, relevance, trace_id)

        relevance_source = "user-override" if relevance_override is not None else "computed"
        message = f"Logged critique from {model} with relevance {relevance:.2f}"

        return trace_id, relevance, relevance_source, message

    def suggest_mode_switch(self) -> Optional[SwitchSuggestion]:
        """Get mode switch suggestion"""
        if not self.current_memory:
            return None

        return self.mode_switch.suggest_mode_switch(self.current_memory)

    def get_context_for_consult(self, meditation_trace_id: str, max_tokens: Optional[int] = None) -> Tuple[str, str, List[str], float, List[List[str]], str]:
        """Get context for consult from a meditation trace"""
        if not self.current_memory:
            raise ValueError("No active session.")

        # Find the trace
        trace = None
        for t in self.current_memory.traces:
            if t.id == meditation_trace_id and t.insights:
                trace = t
                break

        if not trace or not trace.insights:
            raise ValueError(f"Meditation trace {meditation_trace_id} not found or has no insights.")

        insights = trace.insights

        # Build system prompt
        system_prompt = f"""You are evaluating creative ideas. The user recently explored concepts through meditation.

Key concepts from their meditation: {', '.join(insights.extracted_patterns)}
Novelty level: {insights.novelty:.2f} (higher = more original)
Semantic clusters: {', '.join([', '.join(cluster) for cluster in insights.semantic_clusters])}

Provide thoughtful critique that helps them develop these ideas further."""

        # Build user prompt chunk
        user_prompt = f"Based on the meditation concepts {', '.join(insights.extracted_patterns)}, "

        concepts = insights.extracted_patterns
        novelty = insights.novelty
        clusters = insights.semantic_clusters

        message = f"Prepared context for consult with {len(concepts)} concepts"

        return system_prompt, user_prompt, concepts, novelty, clusters, message

    def get_critique_for_meditation(self, consult_trace_id: str, num_top_concepts: Optional[int] = None) -> Tuple[List[str], List[str], List[str], str]:
        """Get critique feedback for next meditation"""
        if not self.current_memory:
            raise ValueError("No active session.")

        # Find the trace
        trace = None
        for t in self.current_memory.traces:
            if t.id == consult_trace_id and t.critique:
                trace = t
                break

        if not trace or not trace.critique:
            raise ValueError(f"Consult trace {consult_trace_id} not found or has no critique.")

        critique = trace.critique

        # Extract feedback concepts
        extracted_feedback = self.insight_extractor.extract_feedback(critique.response)
        top_concepts = extracted_feedback[:num_top_concepts or 5]

        # Generate provocative questions
        provocative_questions = [
            f"What happens when you apply '{concept}' in unexpected ways?" for concept in top_concepts[:3]
        ]

        # Build user prompt chunk
        user_prompt = f"Incorporating critique feedback: {', '.join(top_concepts)}. {provocative_questions[0] if provocative_questions else ''}"

        message = f"Extracted {len(top_concepts)} feedback concepts from critique"

        return top_concepts, extracted_feedback, provocative_questions, message

    def generate_next_meditation(self, consult_trace_id: str, creativity_level: float = 0.7, num_suggestions: int = 3) -> Tuple[List[Dict[str, Any]], str, str]:
        """Generate suggestions for the next meditation based on critique feedback"""
        if not self.current_memory:
            raise ValueError("No active session.")

        # Find the consult trace
        consult_trace = None
        for t in self.current_memory.traces:
            if t.id == consult_trace_id and t.critique:
                consult_trace = t
                break

        if not consult_trace or not consult_trace.critique:
            raise ValueError(f"Consult trace {consult_trace_id} not found or has no critique.")

        # Find the preceding meditation trace (if any)
        meditation_trace = None
        consult_index = None
        for i, t in enumerate(self.current_memory.traces):
            if t.id == consult_trace_id:
                consult_index = i
                break

        if consult_index is not None and consult_index > 0:
            # Look backwards for the most recent meditation
            for i in range(consult_index - 1, -1, -1):
                if self.current_memory.traces[i].meditation:
                    meditation_trace = self.current_memory.traces[i]
                    break

        # Extract feedback concepts from critique
        feedback_concepts = self.insight_extractor.extract_feedback(consult_trace.critique.response)

        # Generate creative suggestions
        suggestions = []
        base_creativity = max(0.3, min(1.0, creativity_level))  # Clamp to reasonable range

        for i in range(num_suggestions):
            # Vary creativity slightly for each suggestion
            current_creativity = base_creativity + (i * 0.1 - 0.1)  # Slight variation
            current_creativity = max(0.2, min(1.0, current_creativity))

            suggestion = self._generate_meditation_suggestion(
                feedback_concepts, meditation_trace, current_creativity, i
            )
            suggestions.append(suggestion)

        # Overall rationale
        rationale = self._build_generation_rationale(feedback_concepts, meditation_trace, suggestions)

        message = f"Generated {len(suggestions)} meditation suggestions based on critique feedback"

        return suggestions, rationale, message

    def _generate_meditation_suggestion(self, feedback_concepts: List[str], meditation_trace: Optional[MeditationTrace],
                                      creativity_level: float, suggestion_index: int) -> Dict[str, Any]:
        """Generate a single meditation suggestion"""
        # Select core concepts from feedback (prioritize most relevant)
        core_concepts = feedback_concepts[:3]  # Use top 3 feedback concepts

        # Generate additional context words based on creativity level
        additional_words = self._expand_concept_space(core_concepts, creativity_level, suggestion_index)

        # Combine core feedback concepts with creative expansions
        suggested_context = core_concepts + additional_words

        # Ensure variety and limit to reasonable number
        suggested_context = list(set(suggested_context))  # Remove duplicates
        suggested_context = suggested_context[:8]  # Limit to 8 words max

        # Calculate confidence based on concept relevance and creativity balance
        base_confidence = 0.8 if len(core_concepts) >= 2 else 0.6
        creativity_penalty = abs(creativity_level - 0.7) * 0.2  # Penalty for extreme creativity levels
        confidence = max(0.4, base_confidence - creativity_penalty)

        # Generate creative focus description
        focus_description = self._generate_focus_description(core_concepts, additional_words, creativity_level)

        return {
            "context_words": suggested_context,
            "creative_focus": focus_description,
            "confidence": confidence,
            "creativity_level": creativity_level,
            "rationale": f"Built around feedback concepts {', '.join(core_concepts)} with {len(additional_words)} creative expansions"
        }

    def _expand_concept_space(self, core_concepts: List[str], creativity_level: float, seed: int) -> List[str]:
        """Expand concept space with creative associations"""
        expansions = []

        # Base expansion size on creativity level
        expansion_count = int(creativity_level * 5) + 1  # 1-6 words based on creativity

        # Use simple word associations (could be enhanced with better NLP)
        association_map = {
            "consciousness": ["awareness", "mind", "presence", "being", "self"],
            "patterns": ["structures", "cycles", "forms", "designs", "systems"],
            "emergence": ["arising", "becoming", "unfolding", "manifestation", "growth"],
            "creativity": ["imagination", "innovation", "expression", "creation", "art"],
            "transformation": ["change", "evolution", "metamorphosis", "shift", "renewal"],
            "flow": ["movement", "stream", "current", "continuity", "rhythm"],
            "synthesis": ["integration", "combination", "fusion", "unity", "harmony"],
            "potential": ["possibility", "capacity", "promise", "opportunity", "power"]
        }

        # For each core concept, add creative associations
        for concept in core_concepts:
            concept_lower = concept.lower()
            if concept_lower in association_map:
                available_associations = association_map[concept_lower]
                # Select based on creativity and seed for variety
                num_to_add = min(len(available_associations), max(1, int(creativity_level * 2)))
                selected = available_associations[seed % len(available_associations):][:num_to_add]
                expansions.extend(selected)

        # If we don't have enough expansions, add generic creative words
        creative_fallbacks = ["exploration", "discovery", "insight", "connection", "depth", "complexity", "simplicity"]
        while len(expansions) < expansion_count and creative_fallbacks:
            fallback_word = creative_fallbacks.pop(0)
            if fallback_word not in core_concepts:  # Avoid duplicates
                expansions.append(fallback_word)

        return expansions[:expansion_count]

    def _generate_focus_description(self, core_concepts: List[str], additional_words: List[str], creativity_level: float) -> str:
        """Generate a creative focus description"""
        core_str = ", ".join(core_concepts)

        if creativity_level > 0.8:
            style = "highly experimental and boundary-pushing"
        elif creativity_level > 0.6:
            style = "balanced creative exploration"
        elif creativity_level > 0.4:
            style = "focused development and refinement"
        else:
            style = "conservative iteration and deepening"

        if additional_words:
            expansion_str = f"incorporating {', '.join(additional_words[:3])}"
            if len(additional_words) > 3:
                expansion_str += f" and {len(additional_words) - 3} other concepts"
        else:
            expansion_str = "building directly on core feedback"

        return f"Explore {core_str} through {style}, {expansion_str}"

    def _build_generation_rationale(self, feedback_concepts: List[str], meditation_trace: Optional[MeditationTrace],
                                  suggestions: List[Dict[str, Any]]) -> str:
        """Build overall rationale for the suggestions"""
        rationale_parts = []

        # Feedback basis
        if feedback_concepts:
            rationale_parts.append(f"Based on critique feedback concepts: {', '.join(feedback_concepts[:5])}")

        # Historical context
        if meditation_trace and meditation_trace.insights:
            orig_novelty = meditation_trace.insights.novelty
            rationale_parts.append(f"Original meditation had novelty score {orig_novelty:.2f}")

        # Suggestion diversity
        confidences = [s["confidence"] for s in suggestions]
        avg_confidence = sum(confidences) / len(confidences)
        rationale_parts.append(f"Generated {len(suggestions)} suggestions with average confidence {avg_confidence:.2f}")

        # Growth focus
        rationale_parts.append("Designed to facilitate creative growth by transforming critique into generative inspiration")

        return " ".join(rationale_parts)

    def get_session_trace(self, session_id: Optional[str] = None, limit: Optional[int] = None) -> Tuple[str, List[MeditationTrace], int, str]:
        """Get session trace history"""
        target_session_id = session_id or (self.current_memory.session_id if self.current_memory else None)

        if not target_session_id:
            raise ValueError("No session ID provided and no active session.")

        memory = self.current_memory if target_session_id == self.current_memory.session_id else self.storage.load_session(target_session_id)

        if not memory:
            raise ValueError(f"Session {target_session_id} not found.")

        traces = memory.traces[-limit:] if limit else memory.traces
        total_traces = len(memory.traces)

        message = f"Retrieved {len(traces)} traces from session {target_session_id}"

        return target_session_id, traces, total_traces, message

    def resume_session(self, session_id: str) -> Tuple[SessionMetrics, str]:
        """Resume an existing session"""
        memory = self.storage.load_session(session_id)
        if not memory:
            raise ValueError(f"Session {session_id} not found.")

        self.current_memory = memory
        message = f"Resumed session {session_id} with {len(memory.traces)} traces"

        return memory.metrics, message

    def _record_to_resonance_ecosystem(self, event_type: str, concepts: List[str], score: float, trace_id: str):
        """Record bridge events to resonance ecosystem for enhanced pattern detection"""
        # This would call the resonance MCP tools, but for integration we simulate
        # In a full implementation, this would invoke mcp_fast-resonanc_record_ecosystem_moment
        pass  # Placeholder for resonance integration

    def _get_resonance_insights(self) -> Dict[str, Any]:
        """Get resonance insights for enhanced heuristics"""
        # This would call resonance tools to get patterns, coherence, harmony
        # For now, return mock data
        return {
            "coherence": 0.5,
            "is_resonant": False,
            "emergent_patterns": [],
            "dominant_concepts": []
        }

# ============================================================================
# MCP Server
# ============================================================================

# Initialize the bridge engine
bridge = BridgeEngine()

# Create FastMCP server
mcp = FastMCP("Fast Bridge - MCP Cognitive Bridge")

@mcp.tool()
def bridge_start_session() -> str:
    """
    Start a new contemplative session for logging meditation↔critique cycles
    """
    session_id, metrics = bridge.start_session()
    return f"Started session {session_id} at {time.strftime('%H:%M:%S', time.localtime(metrics.last_mode_switch))}"

@mcp.tool()
def bridge_log_meditation(
    emergent_sentence: str,
    context_words: List[str],
    num_random_words: Optional[int] = None,
    seed: Optional[str] = None
) -> str:
    """
    Log a meditation from mcp-creative and extract insights
    """
    try:
        trace_id, insights, message = bridge.log_meditation(
            emergent_sentence, context_words, num_random_words, seed
        )
        return f"{message}. Trace ID: {trace_id}"
    except ValueError as e:
        return f"Error: {e}"

@mcp.tool()
def bridge_log_consult(
    model: str,
    prompt: str,
    response: str,
    system_prompt: Optional[str] = None,
    relevance_override: Optional[float] = None
) -> str:
    """
    Log a critique from mcp-consult and extract feedback
    """
    try:
        trace_id, relevance, relevance_source, message = bridge.log_consult(
            model, prompt, response, system_prompt, relevance_override
        )
        return f"{message} ({relevance_source}). Trace ID: {trace_id}"
    except ValueError as e:
        return f"Error: {e}"

@mcp.tool()
def bridge_suggest_mode_switch() -> str:
    """
    Get suggestion for when to switch between meditation (diverge) and critique (converge) modes
    """
    suggestion = bridge.suggest_mode_switch()

    if not suggestion:
        return "No strong suggestion at this time. Continue with current mode."

    heuristic_details = []
    for heuristic, scores in suggestion.heuristic_scores.items():
        if scores["triggered"]:
            heuristic_details.append(f"{heuristic}: {scores['confidence']:.2f}")

    details = f" ({', '.join(heuristic_details)})" if heuristic_details else ""

    return f"""MODE SWITCH SUGGESTION: {suggestion.suggested_mode.upper()}
Confidence: {suggestion.confidence:.2f}
Reason: {suggestion.reason}{details}"""

@mcp.tool()
def bridge_get_context_for_consult(meditation_trace_id: str, max_tokens: Optional[int] = None) -> str:
    """
    Get formatted context from a meditation trace for use with mcp-consult
    """
    try:
        system_prompt, user_prompt, concepts, novelty, clusters, message = bridge.get_context_for_consult(
            meditation_trace_id, max_tokens
        )

        return f"""{message}

SYSTEM PROMPT:
{system_prompt}

USER PROMPT STARTER:
{user_prompt}

CONCEPTS: {', '.join(concepts)}
NOVELTY: {novelty:.2f}
CLUSTERS: {', '.join([f"[{', '.join(cluster)}]" for cluster in clusters])}"""
    except ValueError as e:
        return f"Error: {e}"

@mcp.tool()
def bridge_get_critique_for_meditation(consult_trace_id: str, num_top_concepts: Optional[int] = None) -> str:
    """
    Get critique feedback formatted for next meditation
    """
    try:
        top_concepts, extracted_feedback, provocative_questions, message = bridge.get_critique_for_meditation(
            consult_trace_id, num_top_concepts
        )

        questions_text = "\n".join(f"- {q}" for q in provocative_questions)

        return f"""{message}

TOP FEEDBACK CONCEPTS: {', '.join(top_concepts)}

PROVOCATIVE QUESTIONS:
{questions_text}

FULL FEEDBACK: {', '.join(extracted_feedback)}"""
    except ValueError as e:
        return f"Error: {e}"

@mcp.tool()
def bridge_generate_next_meditation(consult_trace_id: str, creativity_level: float = 0.7, num_suggestions: int = 3) -> str:
    """
    Generate suggestions for the next meditation based on critique feedback.

    This tool completes the feedback loop by transforming critical analysis into
    creative inspiration, helping thoughts grow through iterative refinement.
    """
    try:
        suggestions, rationale, message = bridge.generate_next_meditation(
            consult_trace_id, creativity_level, num_suggestions
        )

        suggestion_blocks = []
        for i, suggestion in enumerate(suggestions, 1):
            block = f"""SUGGESTION {i}:
Context Words: {', '.join(suggestion['context_words'])}
Creative Focus: {suggestion['creative_focus']}
Confidence: {suggestion['confidence']:.2f}
Creativity Level: {suggestion['creativity_level']:.1f}
Rationale: {suggestion['rationale']}"""
            suggestion_blocks.append(block)

        return f"""{message}

OVERALL RATIONALE:
{rationale}

SUGGESTIONS:
{chr(10).join(suggestion_blocks)}

USAGE TIP: Use these suggestions as context words for your next mcp-creative meditation to continue the growth cycle."""
    except ValueError as e:
        return f"Error: {e}"

@mcp.tool()
def bridge_get_session_trace(session_id: Optional[str] = None, limit: Optional[int] = None) -> str:
    """
    Get the trace history for a session
    """
    try:
        target_session_id, traces, total_traces, message = bridge.get_session_trace(session_id, limit)

        trace_summary = []
        for trace in traces:
            mode_indicator = "🔄" if trace.mode == "diverge" else "🎯"
            if trace.meditation:
                trace_summary.append(f"{mode_indicator} Meditation: {trace.meditation.emergent_sentence[:50]}...")
            elif trace.critique:
                trace_summary.append(f"{mode_indicator} Critique: {trace.critique.response[:50]}...")

        return f"""{message} (total: {total_traces})

RECENT TRACES:
{chr(10).join(trace_summary)}"""
    except ValueError as e:
        return f"Error: {e}"

@mcp.tool()
def bridge_resume_session(session_id: str) -> str:
    """
    Resume an existing session
    """
    try:
        metrics, message = bridge.resume_session(session_id)
        return f"{message}. Current mode: {metrics.current_mode}"
    except ValueError as e:
        return f"Error: {e}"

@mcp.tool()
def bridge_get_available_sessions() -> str:
    """
    Get list of available session IDs
    """
    sessions = bridge.get_available_sessions()
    if not sessions:
        return "No saved sessions found."

    return f"Available sessions: {', '.join(sessions)}"


@mcp.prompt("bridge_workflow")
def bridge_workflow_guide() -> list[dict]:
    """
    Complete guide for the cognitive bridge workflow between creative and critical thinking.

    This prompt explains the contemplative process of alternating between divergent (creative)
    and convergent (critical) modes, with guidance on when and how to switch.
    """
    return [
        {
            "role": "user",
            "content": """# Cognitive Bridge Workflow Guide

## The Contemplative Cycle

The Bridge facilitates a powerful thinking process that alternates between **divergent** (creative exploration) and **convergent** (critical analysis) modes. This creates a feedback loop where creativity informs critique, and critique refines creativity.

## Core Workflow Phases

### Phase 1: Session Setup
**Purpose**: Establish your contemplative space
- **Start Session**: Use `bridge_start_session()` to begin a new thinking cycle
- **Resume if Needed**: Use `bridge_resume_session(session_id)` to continue previous work
- **Check Available**: Use `bridge_get_available_sessions()` to see saved sessions

### Phase 2: Divergent Mode (Creative Exploration)
**Purpose**: Generate ideas and explore possibilities
1. **Create Meditation**: Use mcp-creative to generate emergent sentences
2. **Log Meditation**: Use `bridge_log_meditation()` with the emergent sentence and context words
3. **Automatic Insight**: Bridge extracts concepts, novelty scores, and semantic clusters
4. **Monitor Patterns**: Concepts are tracked for repetition and evolution

### Phase 3: Mode Switch Detection
**Purpose**: Know when to shift from creation to critique
- **Check Suggestions**: Use `bridge_suggest_mode_switch()` regularly
- **Heuristic Triggers**:
  - **Semantic Saturation**: When concepts start repeating (>60% overlap)
  - **Pause Detection**: When you've been thinking/incubating (5+ minutes)
  - **Novelty Drop**: When ideas become less original (<35% novelty)
  - **Critique Freshness**: When feedback becomes repetitive

### Phase 4: Convergent Mode (Critical Analysis)
**Purpose**: Evaluate and refine creative outputs
1. **Prepare Context**: Use `bridge_get_context_for_consult(trace_id)` to format meditation insights
2. **Consult Models**: Send prepared context to mcp-consult for analysis
3. **Log Critique**: Use `bridge_log_consult()` with model response and relevance assessment
4. **Extract Feedback**: Bridge identifies key feedback concepts and provocative questions

### Phase 5: Feedback Integration
**Purpose**: Use critique to inform next creative cycle
- **Get Feedback**: Use `bridge_get_critique_for_meditation(trace_id)` to extract actionable insights
- **Provocative Questions**: Bridge generates questions to challenge your thinking
- **Context Words**: Use feedback concepts as new context for next meditation

### Phase 6: Cycle Continuation
**Purpose**: Maintain the creative-critical feedback loop
- **Monitor Mode**: Bridge tracks current mode (diverge/converge)
- **Session History**: Use `bridge_get_session_trace()` to review progress
- **Iterative Refinement**: Each cycle builds on previous insights

## Bridge Intelligence Features

### Automatic Insight Extraction
- **Concept Mining**: Extracts key ideas from meditation text
- **Novelty Scoring**: Measures how original ideas are (0-1 scale)
- **Semantic Clustering**: Groups related concepts together
- **Pattern Recognition**: Tracks concept evolution across cycles

### Smart Mode Switching
- **Multi-Heuristic Analysis**: Four different algorithms detect switch timing
- **Confidence Scoring**: Suggestions include confidence levels
- **Context Awareness**: Switches consider recent activity patterns
- **Adaptive Thresholds**: System learns from successful transitions

### Context Formatting
- **Consult Preparation**: Formats meditation insights for optimal critique
- **Feedback Extraction**: Identifies most relevant critique concepts
- **Question Generation**: Creates provocative questions for deeper thinking
- **Relevance Assessment**: Scores how well critique applies to ideas

## Best Practices

### Session Management
- **Regular Sessions**: Start new sessions for different projects/topics
- **Resume Wisely**: Continue sessions when building on previous work
- **Session Limits**: Bridge keeps last 1000 traces per session

### Creative Phase Tips
- **Rich Context**: Provide meaningful context words for meditations
- **Pattern Awareness**: Notice when concepts start repeating
- **Incubation Time**: Allow pauses between activities for insight emergence

### Critical Phase Tips
- **Context Quality**: Use Bridge-prepared context for better critiques
- **Relevance Override**: Manually adjust relevance scores if needed
- **Feedback Integration**: Use extracted concepts in next creative cycle

### Mode Switching Wisdom
- **Trust Suggestions**: Bridge suggestions are based on proven heuristics
- **Override When Needed**: Sometimes intuition knows better than algorithms
- **Balance Cycles**: Alternate between creation and critique regularly
- **Quality over Speed**: Better insights come from well-timed transitions

## Understanding Bridge Metrics

### Novelty Scores (0-1)
- **0.8-1.0**: Highly original, breakthrough ideas
- **0.5-0.8**: Moderately novel, good development potential
- **0.2-0.5**: Somewhat repetitive, may need new directions
- **0.0-0.2**: Very similar to previous ideas, time for critique

### Relevance Scores (0-1)
- **0.8-1.0**: Critique highly applicable to your ideas
- **0.5-0.8**: Moderately relevant, useful insights
- **0.2-0.5**: Somewhat tangential, consider context
- **0.0-0.2**: Not very relevant, may need different critique approach

### Heuristic Confidence (0-1)
- **0.7-1.0**: Strong signal, high likelihood of beneficial switch
- **0.4-0.7**: Moderate signal, consider switching soon
- **0.2-0.4**: Weak signal, monitor but continue current mode
- **0.0-0.2**: No clear signal, continue with current flow

## Advanced Usage Patterns

### Deep Contemplation Cycles
1. Multiple meditation rounds before critique
2. Extended critique analysis periods
3. Iterative refinement through many cycles

### Collaborative Thinking
1. Share session IDs with others
2. Import external critiques as consult logs
3. Cross-pollinate insights between different projects

### Research and Analysis
1. Track concept evolution over time
2. Analyze successful vs unsuccessful cycles
3. Identify personal thinking patterns and biases

The Bridge serves as your cognitive companion, helping you navigate the delicate dance between creation and critique, divergence and convergence, exploration and refinement."""
        }
    ]


@mcp.prompt("session_management")
def session_management_template(
    action: str = "start",
    session_id: Optional[str] = None,
    project_context: Optional[str] = None
) -> list[dict]:
    """
    Template for managing contemplative sessions effectively.

    Args:
        action: What session action to perform (start, resume, list, review)
        session_id: Session ID for resume/review actions
        project_context: Description of the project or thinking topic
    """
    base_content = f"""# Session Management Guide

## Action: {action.title()}

## Current Context
{f"Project: {project_context}" if project_context else "General contemplative session"}

## Session Management Commands

### Starting New Sessions
When beginning new thinking projects or topics:
```
bridge_start_session()
```
- Creates a fresh contemplative space
- Initializes diverge mode (creative exploration)
- Returns a unique session ID for future reference

### Resuming Existing Sessions
When continuing previous work:
```
bridge_resume_session("{session_id or 'your-session-id'}")
```
- Restores previous session state
- Continues from last mode and metrics
- Maintains trace history and patterns

### Listing Available Sessions
To see all saved sessions:
```
bridge_get_available_sessions()
```
- Shows all session IDs with saved traces
- Helps you choose which session to resume
- Useful for managing multiple projects

### Reviewing Session History
To examine session progress:
```
bridge_get_session_trace("{session_id or 'current'}", limit=10)
```
- Shows recent traces with mode indicators
- Displays meditation/critique summaries
- Helps track thinking evolution

## Best Practices by Scenario

### New Project/Topic
1. **Start Fresh**: Use `bridge_start_session()` for new ideas
2. **Set Intention**: Note your thinking goals or questions
3. **Begin Creating**: Immediately enter creative meditation phase

### Continuing Work
1. **List Sessions**: Check `bridge_get_available_sessions()` first
2. **Resume Recent**: Choose the most relevant session ID
3. **Review Progress**: Use `bridge_get_session_trace()` to catch up
4. **Continue Flow**: Pick up where you left off

### Multiple Projects
1. **Organize by Topic**: Use descriptive session naming conventions
2. **Switch Between**: Resume different sessions as needed
3. **Cross-Pollinate**: Bring insights from one session to another

### Long-Term Thinking
1. **Regular Sessions**: Resume sessions over days/weeks
2. **Track Evolution**: Review trace history to see progress
3. **Pattern Recognition**: Notice how your thinking develops

## Session State Tracking

### Current Mode
- **Diverge**: Creative exploration, idea generation
- **Converge**: Critical analysis, evaluation, refinement

### Key Metrics
- **Trace Count**: Number of meditation/critique cycles
- **Last Switch**: When mode last changed
- **Active Patterns**: Concepts being tracked
- **Heuristic State**: Current suggestion readiness

## Troubleshooting

### "No active session" Error
- **Cause**: No session started or resumed
- **Solution**: Call `bridge_start_session()` or `bridge_resume_session(id)`

### Session Not Found
- **Cause**: Session ID doesn't exist or was deleted
- **Solution**: Check `bridge_get_available_sessions()` for valid IDs

### Lost Progress
- **Prevention**: Note session IDs after starting
- **Recovery**: Use `bridge_get_available_sessions()` to find sessions
- **Backup**: Consider exporting important session traces

## Advanced Session Strategies

### Session Branching
Create multiple sessions for different approaches to the same problem, then compare their evolution.

### Session Merging
Manually combine insights from different sessions by logging them into a new session.

### Session Archiving
Keep completed sessions for reference, start fresh ones for new challenges.

Remember: Each session represents a unique contemplative journey. Choose wisely when to start new ones versus continuing existing paths."""
    if session_id:
        base_content += f"""

## Target Session: {session_id}
Use this ID with resume/review commands."""

    messages = [
        {
            "role": "user",
            "content": base_content
        }
    ]

    return messages


@mcp.prompt("meditation_logging")
def meditation_logging_template(
    emergent_sentence: str,
    context_words: List[str],
    creative_focus: Optional[str] = None,
    additional_metadata: Optional[str] = None
) -> list[dict]:
    """
    Template for logging creative meditations with proper context and metadata.

    Args:
        emergent_sentence: The emergent sentence from mcp-creative
        context_words: List of context words used
        creative_focus: What you were trying to explore or create
        additional_metadata: Any additional context about this meditation
    """
    context_str = ", ".join(f'"{word}"' for word in context_words)

    base_content = f"""# Meditation Logging Guide

## Emergent Sentence
"{emergent_sentence}"

## Context Words Used
[{context_str}]

## Logging Command
Use the `bridge_log_meditation` tool with these parameters:
```
emergent_sentence: "{emergent_sentence}"
context_words: [{context_str}]
```

## What Happens During Logging

### Automatic Insight Extraction
- **Concept Mining**: Bridge extracts key concepts from your emergent sentence
- **Novelty Scoring**: Measures originality compared to recent meditations (0-1 scale)
- **Semantic Clustering**: Groups related concepts into meaningful clusters
- **Pattern Tracking**: Adds concepts to session-wide pattern recognition

### Session Updates
- **Mode Setting**: Confirms current mode as "diverge" (creative)
- **Trace Creation**: Creates a timestamped trace with full meditation data
- **History Preservation**: Adds to session trace history (last 1000 traces kept)

## Understanding the Results

### Insight Components
- **Extracted Patterns**: Key concepts Bridge identified (typically 3-5)
- **Novelty Score**: How different this meditation is from recent ones
- **Semantic Clusters**: Groups of related concepts Bridge found
- **Trace ID**: Unique identifier for referencing this meditation

### Example Results
```
Logged meditation with 4 concepts, novelty: 0.85. Trace ID: abc-123-def
```

## Best Practices for Logging

### Rich Context Words
- Choose words that genuinely represent your creative intention
- Include both concrete and abstract concepts
- Consider emotional or qualitative aspects
- Use words that intrigue or challenge you

### Emergent Sentence Quality
- **Length**: Aim for meaningful but not overwhelming sentences
- **Coherence**: Look for unexpected connections and patterns
- **Resonance**: Note sentences that particularly resonate with you
- **Novelty**: Balance familiarity with surprising elements

### Timing Considerations
- **Fresh Logging**: Log immediately after meditation for best context
- **Session Continuity**: Log within active sessions to maintain pattern tracking
- **Regular Cadence**: Log consistently to build meaningful trace histories

## Advanced Logging Features

### Optional Parameters
```
num_random_words: 12  # How many random words were used (default: 12)
seed: "custom-seed"   # If you used a specific seed for reproducibility
```

### Metadata Enhancement
{f"Additional Context: {additional_metadata}" if additional_metadata else "Consider adding notes about your mental state, external influences, or specific goals for this meditation."}

### Pattern Awareness
- **Repetition Tracking**: Bridge notices when concepts repeat across meditations
- **Evolution Monitoring**: See how your creative focus develops over time
- **Saturation Detection**: Get warnings when ideas become repetitive

## Next Steps After Logging

### Immediate Actions
1. **Review Insights**: Note the extracted concepts and novelty score
2. **Check Mode Switch**: Consider using `bridge_suggest_mode_switch()`
3. **Save Trace ID**: Keep the returned trace ID for future reference

### Integration with Workflow
1. **Critique Preparation**: Use trace ID with `bridge_get_context_for_consult()`
2. **Session Review**: Check `bridge_get_session_trace()` to see meditation in context
3. **Pattern Analysis**: Look for evolving themes across multiple meditations

### Creative Development
1. **Build on Insights**: Use extracted concepts in next meditation's context words
2. **Question Generation**: Let Bridge create provocative questions from your work
3. **Iterative Refinement**: Use critique feedback to guide future creative exploration

Remember: Each logged meditation becomes part of your contemplative journey, building a rich tapestry of creative evolution that the Bridge can analyze and enhance."""

    if creative_focus:
        base_content += f"""

## Creative Focus: {creative_focus}
This meditation was exploring: {creative_focus}"""

    messages = [
        {
            "role": "user",
            "content": base_content
        }
    ]

    return messages


@mcp.prompt("critique_logging")
def critique_logging_template(
    model_used: str,
    prompt_sent: str,
    response_received: str,
    system_prompt_used: Optional[str] = None,
    relevance_assessment: Optional[str] = None,
    meditation_context: Optional[str] = None
) -> list[dict]:
    """
    Template for logging critical analysis from consult sessions.

    Args:
        model_used: Which Ollama model provided the critique
        prompt_sent: The prompt sent to the model
        response_received: The model's response
        system_prompt_used: System prompt used (if any)
        relevance_assessment: Your assessment of how relevant the critique is
        meditation_context: Which meditation this critique is responding to
    """
    base_content = f"""# Critique Logging Guide

## Critique Details
- **Model**: {model_used}
- **Prompt Sent**: {prompt_sent[:100]}...
- **Response Length**: {len(response_received)} characters

## Response Preview
{response_received[:200]}...

## Logging Command
Use the `bridge_log_consult` tool with these parameters:
```
model: "{model_used}"
prompt: "{prompt_sent[:200]}..."  # Truncated for readability
response: "{response_received[:500]}..."  # Truncated for readability
{f'system_prompt: "{system_prompt_used}"' if system_prompt_used else ""}
```

## What Happens During Logging

### Automatic Processing
- **Relevance Scoring**: Bridge assesses how well critique applies to ideas (0-1 scale)
- **Feedback Extraction**: Identifies key feedback concepts from response
- **Pattern Integration**: Adds critique to session-wide pattern analysis
- **Mode Transition**: Updates session to "converge" mode

### Session Updates
- **Trace Creation**: Creates timestamped critique trace
- **History Building**: Adds to contemplative trace history
- **Context Linking**: Connects critique to preceding meditation context

## Relevance Assessment Guidelines

### High Relevance (0.8-1.0)
- Directly addresses the core ideas from meditation
- Provides specific, actionable feedback
- Shows deep understanding of the concepts
- Offers constructive suggestions for development

### Moderate Relevance (0.5-0.8)
- Addresses some aspects of the meditation
- Provides generally useful feedback
- May be somewhat tangential but still valuable
- Offers reasonable suggestions

### Low Relevance (0.2-0.5)
- Only loosely connected to meditation concepts
- Generic feedback not specific to ideas
- May miss important nuances
- Limited practical application

### Minimal Relevance (0.0-0.2)
- Completely off-topic or irrelevant
- Doesn't engage with presented concepts
- Generic responses without context
- Not useful for idea development

## Manual Relevance Override
{f"Your Assessment: {relevance_assessment}" if relevance_assessment else "If Bridge's automatic relevance score doesn't match your judgment, you can override it:"}
```
relevance_override: 0.9  # Your preferred relevance score
```

## Best Practices for Critique Integration

### Context Preservation
{f"Meditation Context: {meditation_context}" if meditation_context else "Link critiques to specific meditations for better context tracking."}

### Feedback Utilization
- **Extract Key Concepts**: Bridge will identify main feedback themes
- **Generate Questions**: System creates provocative questions for deeper thinking
- **Integration Preparation**: Feedback formatted for next creative cycle

### Quality Assessment
- **Depth of Analysis**: Does critique go beyond surface-level observations?
- **Constructive Nature**: Is feedback helpful rather than just critical?
- **Original Insights**: Does it offer new perspectives you hadn't considered?
- **Actionable Suggestions**: Can you use this feedback to improve your ideas?

## Advanced Logging Features

### System Prompt Context
{f"System Prompt Used: {system_prompt_used}" if system_prompt_used else "Consider using Bridge-prepared system prompts for better critique context."}

### Multi-Model Comparison
- Log critiques from different models for comparison
- Track which models provide most valuable feedback
- Build preference patterns over time

### Iterative Critique
- Use feedback from one critique to inform next consult session
- Build cumulative understanding across multiple critiques
- Track critique evolution on same meditation

## Next Steps After Logging

### Immediate Actions
1. **Review Relevance**: Check Bridge's relevance assessment
2. **Extract Feedback**: Use `bridge_get_critique_for_meditation(trace_id)` for insights
3. **Save Trace ID**: Keep returned critique trace ID for reference

### Workflow Integration
1. **Feedback Loop**: Use extracted concepts in next meditation context
2. **Mode Switch Check**: Consider `bridge_suggest_mode_switch()` after critique
3. **Session Review**: Check `bridge_get_session_trace()` to see critique in context

### Development Cycle
1. **Apply Feedback**: Incorporate critique insights into creative process
2. **Question Exploration**: Use Bridge-generated provocative questions
3. **Iterative Refinement**: Continue meditation-critique cycles for deeper understanding

Remember: Each logged critique becomes part of your contemplative dialogue, helping refine and develop your creative ideas through critical analysis."""

    messages = [
        {
            "role": "user",
            "content": base_content
        }
    ]

    return messages


@mcp.prompt("mode_switch_interpretation")
def mode_switch_interpretation_template(
    current_suggestion: Optional[str] = None,
    confidence_level: Optional[float] = None,
    triggered_heuristics: Optional[str] = None,
    current_mode: Optional[str] = None
) -> list[dict]:
    """
    Template for understanding and acting on mode switch suggestions.

    Args:
        current_suggestion: The suggested mode (diverge/converge)
        confidence_level: Confidence score (0-1)
        triggered_heuristics: Which heuristics were triggered
        current_mode: Current session mode
    """
    base_content = f"""# Mode Switch Interpretation Guide

## Current Mode Switch Analysis

{f"**Suggested Mode**: {current_suggestion.upper()}" if current_suggestion else "**No Strong Suggestion**: Continue with current mode"}
{f"**Confidence**: {confidence_level:.2f}" if confidence_level is not None else ""}
{f"**Triggered Heuristics**: {triggered_heuristics}" if triggered_heuristics else ""}
{f"**Current Mode**: {current_mode.upper()}" if current_mode else ""}

## Understanding Mode Switch Suggestions

### The Two Modes

#### Diverge Mode (Creative Exploration)
- **Purpose**: Generate ideas, explore possibilities, create new connections
- **Activities**: Meditation, brainstorming, free association, pattern discovery
- **Bridge Tools**: `bridge_log_meditation()`, creative generation
- **Indicators**: High novelty, fresh concepts, exploratory energy

#### Converge Mode (Critical Analysis)
- **Purpose**: Evaluate ideas, refine concepts, make decisions, optimize
- **Activities**: Critique, analysis, feedback integration, focused improvement
- **Bridge Tools**: `bridge_log_consult()`, critical evaluation
- **Indicators**: Pattern refinement, decision making, implementation focus

### Heuristic Explanations

#### Semantic Saturation
- **Trigger**: When concepts repeat >60% between recent meditations
- **Meaning**: Your creative exploration has found a stable pattern
- **Action**: Time to critique and refine these established ideas
- **Confidence**: High when overlap is significant

#### Pause Detection
- **Trigger**: Extended time (5+ minutes) since last activity
- **Meaning**: Your subconscious is processing/incubating ideas
- **Action**: Often good time to switch to critical analysis
- **Confidence**: Increases with pause duration

#### Novelty Drop
- **Trigger**: Recent meditations have <35% novelty compared to session average
- **Meaning**: Ideas are becoming repetitive or stale
- **Action**: Need fresh perspective through critique
- **Confidence**: Strong when novelty consistently low

#### Critique Freshness
- **Trigger**: Recent critiques show >70% overlap in feedback concepts
- **Meaning**: Critical analysis is circling same points
- **Action**: Return to creative exploration for new ideas
- **Confidence**: High when critique becomes repetitive

## Interpreting Confidence Levels

### High Confidence (0.7-1.0)
- **Strong Signal**: Clear pattern indicates beneficial mode switch
- **Recommended Action**: Follow the suggestion
- **Rationale**: Multiple heuristics or strong single signal
- **Expected Outcome**: High likelihood of productive transition

### Moderate Confidence (0.4-0.7)
- **Moderate Signal**: Some evidence suggests switching
- **Recommended Action**: Consider switching, but trust your intuition
- **Rationale**: Partial heuristic activation or mixed signals
- **Expected Outcome**: Potentially beneficial, low risk

### Low Confidence (0.2-0.4)
- **Weak Signal**: Minimal evidence for mode switch
- **Recommended Action**: Continue current mode, monitor for stronger signals
- **Rationale**: Isolated or weak heuristic triggers
- **Expected Outcome**: Unlikely to disrupt current productive flow

### No Confidence (0.0-0.2)
- **No Clear Signal**: System detects no strong switching indicators
- **Recommended Action**: Stay in current mode
- **Rationale**: Insufficient data or balanced heuristics
- **Expected Outcome**: Current mode likely still productive

## Action Guidelines by Scenario

### Following High Confidence Suggestions
1. **Immediate Transition**: Switch modes as suggested
2. **Full Engagement**: Commit to the new mode completely
3. **Context Carryover**: Bring insights from previous mode
4. **Expectation Setting**: Anticipate productive session

### Moderate Confidence Decisions
1. **Intuition Check**: Consider how you feel about switching
2. **Quick Assessment**: Review recent work quality
3. **Trial Basis**: Try the suggested mode briefly
4. **Flexible Approach**: Easy to switch back if needed

### Ignoring Suggestions
1. **Flow Preservation**: If deeply engaged in current mode
2. **Intuition Priority**: When you sense the algorithm is wrong
3. **Context Awareness**: If external factors influence timing
4. **Override Tracking**: Note why you ignored the suggestion

## Practical Implementation

### Switching to Diverge Mode
1. **Creative Preparation**: Clear mental space for exploration
2. **Context Words**: Use recent critique feedback as inspiration
3. **Meditation Setup**: Prepare for generative, open-ended thinking
4. **Expectation**: Embrace uncertainty and possibility

### Switching to Converge Mode
1. **Critical Preparation**: Focus on evaluation and refinement
2. **Context Gathering**: Use Bridge to prepare consultation context
3. **Analysis Framework**: Structure thinking around key questions
4. **Expectation**: Seek clarity and actionable insights

## Advanced Mode Switch Strategies

### Anticipatory Switching
- **Early Signals**: Act on moderate confidence before it becomes high
- **Pattern Recognition**: Learn your personal switching rhythms
- **Context Awareness**: Consider project phase and external factors

### Override Patterns
- **Track Decisions**: Note when you override suggestions and why
- **Pattern Analysis**: Look for personal preferences vs algorithmic suggestions
- **Calibration**: Adjust trust in system based on outcomes

### Hybrid Approaches
- **Gradual Transitions**: Ease into new mode rather than abrupt switches
- **Parallel Processing**: Maintain some activities from previous mode
- **Flexible Timing**: Switch when it feels right, not just when suggested

## Monitoring Switch Effectiveness

### Success Indicators
- **Flow Restoration**: New mode provides fresh energy
- **Insight Generation**: Productive ideas or realizations emerge
- **Progress Acceleration**: Work advances more rapidly
- **Satisfaction Increase**: Feel more engaged with the process

### Adjustment Triggers
- **Resistance**: If new mode feels forced or unproductive
- **Backtracking**: Return to previous mode if needed
- **Re-evaluation**: Reassess suggestion if context changed
- **Pattern Learning**: Note what works for your thinking style

Remember: Mode switches are opportunities for cognitive refreshment. The Bridge provides guidance, but your intuition about timing and context remains the final authority."""

    messages = [
        {
            "role": "user",
            "content": base_content
        }
    ]

    return messages


@mcp.prompt("context_preparation")
def context_preparation_template(
    meditation_trace_id: str,
    consult_goal: str = "comprehensive critique",
    additional_context: Optional[str] = None,
    model_preferences: Optional[str] = None
) -> list[dict]:
    """
    Template for preparing optimal context for consult sessions.

    Args:
        meditation_trace_id: The trace ID from a logged meditation
        consult_goal: What you want to achieve with this consultation
        additional_context: Extra context to include
        model_preferences: Preferred models or consultation style
    """
    base_content = f"""# Context Preparation Guide

## Target Meditation: {meditation_trace_id}

## Consultation Goal: {consult_goal}

## Context Preparation Process

### Step 1: Retrieve Bridge Context
Use `bridge_get_context_for_consult` to get formatted context:
```
bridge_get_context_for_consult("{meditation_trace_id}")
```

### Step 2: Understanding the Output

#### System Prompt
Bridge prepares a system prompt that includes:
- **Meditation Context**: Key concepts from your creative work
- **Novelty Level**: How original your ideas are (0-1 scale)
- **Semantic Clusters**: Groups of related concepts identified
- **Consultation Framing**: Instructions for effective critique

#### User Prompt Starter
Bridge provides a starting point for your consultation:
- **Concept Integration**: Incorporates extracted concepts
- **Open-Ended Structure**: Allows you to complete the consultation focus
- **Context Preservation**: Maintains connection to your creative work

#### Supporting Data
- **Concepts List**: Key concepts Bridge extracted (typically 3-5)
- **Novelty Score**: Originality measurement for context
- **Semantic Clusters**: Related concept groupings

### Step 3: Customize for Your Goal

#### Goal-Based Customization
{f"**Your Goal**: {consult_goal}" if consult_goal else "**Default Goal**: Comprehensive critique and feedback"}

#### Goal-Specific Approaches

**For Comprehensive Critique:**
- Use full system prompt and concept list
- Ask for balanced analysis of strengths and weaknesses
- Request specific suggestions for development

**For Specific Analysis:**
- Focus on particular concepts from the extracted list
- Ask targeted questions about specific aspects
- Request analysis from particular perspectives

**For Comparative Analysis:**
- Include multiple meditation traces if available
- Ask for comparison between different creative outputs
- Request analysis of evolution or patterns

**For Practical Application:**
- Ask how concepts could be implemented or applied
- Request concrete examples or use cases
- Focus on feasibility and real-world relevance

### Step 4: Model Selection Considerations

{f"**Model Preferences**: {model_preferences}" if model_preferences else "**Model Selection Tips**:"}
- **Analytical Models**: Good for structured critique (e.g., analytical thinking models)
- **Creative Models**: Good for generating alternative perspectives
- **Balanced Models**: Good for comprehensive feedback
- **Specialized Models**: Good for domain-specific analysis

### Step 5: Complete Consultation Prompt

#### Using Bridge-Prepared Context
Combine the Bridge system prompt with your specific consultation:

**System Prompt (from Bridge):**
[Use the system prompt returned by bridge_get_context_for_consult]

**User Prompt:**
[Bridge starter] + [your specific consultation focus]

#### Example Complete Consultation
```
System: [Bridge-prepared system prompt]

User: Based on the meditation concepts emergence, flow, synthesis, provide a critical analysis of how these ideas could be developed into a practical framework. What are the strengths and potential limitations?
```

## Advanced Context Preparation

### Multi-Trace Context
For richer consultation, consider:
- Including context from previous meditations in the session
- Referencing related critiques for continuity
- Building cumulative context across multiple creative cycles

### Context Enhancement
{f"**Additional Context**: {additional_context}" if additional_context else "**Optional Enhancements**:"}
- Add project background or constraints
- Include specific questions or concerns
- Provide examples of desired output format
- Specify evaluation criteria

### Session Context Integration
- **Recent History**: Reference patterns from session trace history
- **Mode Context**: Note current diverge/converge state
- **Evolution Tracking**: Mention how concepts have developed

## Quality Assurance Checklist

### Before Consultation
- [ ] Bridge context retrieved successfully
- [ ] System prompt includes all key concepts
- [ ] User prompt clearly states consultation goal
- [ ] Model selected matches consultation needs
- [ ] Additional context integrated if needed

### During Consultation
- [ ] Model receives full context properly
- [ ] Response addresses the key concepts identified
- [ ] Feedback is relevant to your creative work
- [ ] Analysis provides actionable insights

### After Consultation
- [ ] Log critique with `bridge_log_consult`
- [ ] Extract feedback with `bridge_get_critique_for_meditation`
- [ ] Consider mode switch suggestions
- [ ] Plan next steps based on insights

## Troubleshooting Context Issues

### Poor Context Retrieval
- **Problem**: Bridge returns error or incomplete context
- **Solution**: Verify meditation trace ID is correct and exists
- **Check**: Use `bridge_get_session_trace` to confirm trace availability

### Irrelevant Critique
- **Problem**: Model response doesn't address your concepts
- **Solution**: Ensure system prompt includes extracted concepts clearly
- **Enhancement**: Add explicit instructions about focus areas

### Generic Feedback
- **Problem**: Response is too general or boilerplate
- **Solution**: Make consultation goals more specific and concrete
- **Improvement**: Include examples of desired feedback style

### Context Overload
- **Problem**: Too much context confuses the model
- **Solution**: Prioritize most important concepts and clusters
- **Simplification**: Break complex consultations into focused questions

Remember: Well-prepared context leads to more valuable critique. The Bridge helps structure your creative work for optimal analytical engagement."""

    messages = [
        {
            "role": "user",
            "content": base_content
        }
    ]

    return messages


@mcp.prompt("next_meditation_guidance")
def next_meditation_guidance_template(
    consult_trace_id: str,
    creativity_preference: float = 0.7,
    num_suggestions: int = 3,
    growth_focus: Optional[str] = None
) -> list[dict]:
    """
    Template for generating the next meditation based on critique feedback.

    This prompt guides the transformation of critical analysis into creative inspiration,
    helping thoughts grow through the feedback loop.

    Args:
        consult_trace_id: The trace ID from a logged critique session
        creativity_preference: Desired creativity level (0.3-1.0, where higher = more experimental)
        num_suggestions: Number of meditation suggestions to generate
        growth_focus: Specific aspect of growth to emphasize
    """
    base_content = f"""# Next Meditation Generation Guide

## Target Critique: {consult_trace_id}

## Growth Through Feedback

This guide helps transform critical analysis into creative inspiration, completing the contemplative cycle where critique feeds back into creation. The goal is to help your thoughts *grow* by using feedback as fertilizer for new creative exploration.

## Generation Process

### Step 1: Generate Suggestions
Use `bridge_generate_next_meditation` to create meditation suggestions:
```
bridge_generate_next_meditation(
    consult_trace_id="{consult_trace_id}",
    creativity_level={creativity_preference},
    num_suggestions={num_suggestions}
)
```

### Step 2: Understanding the Output

#### Overall Rationale
Bridge provides context for why these suggestions were generated:
- **Feedback Basis**: Which critique concepts influenced the suggestions
- **Historical Context**: How original meditation factors in
- **Confidence Metrics**: Reliability assessment of suggestions
- **Growth Philosophy**: How suggestions facilitate creative development

#### Individual Suggestions
Each suggestion includes:
- **Context Words**: Recommended words for mcp-creative meditation
- **Creative Focus**: Descriptive guidance for your creative approach
- **Confidence Score**: How reliable this suggestion is (0-1 scale)
- **Creativity Level**: How experimental the suggestion is
- **Specific Rationale**: Why this particular combination was chosen

### Step 3: Selecting and Using Suggestions

#### Selection Criteria
**High Confidence (0.7+):**
- Most reliable suggestions based on strong critique feedback
- Good starting point for structured creative development
- Lower risk of unproductive exploration

**Medium Confidence (0.4-0.7):**
- Balanced suggestions with moderate experimental elements
- Good for expanding beyond comfort zone
- Higher potential for novel insights

**Lower Confidence (0.2-0.4):**
- More experimental suggestions
- Higher risk/reward ratio
- Best when you want to push creative boundaries

#### Implementation Steps
1. **Choose Suggestion**: Pick one that resonates with your current state
2. **Prepare Context**: Use the suggested context words
3. **Set Intention**: Consider the creative focus description
4. **Meditate**: Run mcp-creative with the new context
5. **Log Result**: Use `bridge_log_meditation` to continue the cycle

## Creativity Level Guidelines

### Conservative (0.3-0.5)
- **Approach**: Focused iteration and deepening
- **Best For**: Refining existing ideas, building confidence
- **Risk Level**: Low - stays close to familiar territory
- **Growth Type**: Incremental development and strengthening

### Balanced (0.6-0.8)
- **Approach**: Creative exploration with structure
- **Best For**: Developing ideas while maintaining coherence
- **Risk Level**: Medium - explores new connections
- **Growth Type**: Expansive development with stability

### Experimental (0.9-1.0)
- **Approach**: Boundary-pushing and innovative
- **Best For**: Breaking through creative blocks, radical innovation
- **Risk Level**: High - may generate unexpected or challenging results
- **Growth Type**: Transformative and paradigm-shifting

## Growth Focus Areas

{f"**Your Focus**: {growth_focus}" if growth_focus else "**Common Growth Areas**:"}

### Depth Exploration
- **Goal**: Understand concepts at deeper levels
- **Strategy**: Use feedback to identify unexplored aspects
- **Outcome**: Richer, more nuanced understanding

### Breadth Expansion
- **Goal**: Connect ideas to new domains
- **Strategy**: Generate associations beyond original context
- **Outcome**: More interconnected and versatile thinking

### Integration Synthesis
- **Goal**: Combine disparate elements into unified wholes
- **Strategy**: Focus on synthesis and integration concepts
- **Outcome**: More coherent and powerful frameworks

### Practical Application
- **Goal**: Make ideas more actionable and real-world relevant
- **Strategy**: Emphasize implementation and feasibility
- **Outcome**: More useful and applicable concepts

### Radical Innovation
- **Goal**: Generate breakthrough ideas and novel combinations
- **Strategy**: Push creativity levels high and embrace uncertainty
- **Outcome**: Potentially transformative new directions

## Advanced Usage Patterns

### Iterative Refinement
1. Generate suggestions after each critique
2. Select and implement one suggestion
3. Critique the new meditation
4. Use feedback to generate next suggestions
5. Repeat cycle for progressive development

### Comparative Exploration
1. Generate multiple suggestions with different creativity levels
2. Implement 2-3 different approaches
3. Compare results and choose most promising direction
4. Use successful patterns to inform future generations

### Thematic Development
1. Identify core themes across multiple critiques
2. Generate suggestions focused on specific themes
3. Build depth in promising areas
4. Branch out to related but distinct areas

### Risk Management
1. Start with lower creativity levels for stability
2. Gradually increase experimental elements
3. Use confidence scores to balance risk/reward
4. Have fallback approaches ready

## Quality Assessment

### Good Suggestions Indicators
- **Resonance**: Context words feel meaningful and intriguing
- **Balance**: Mix of familiar and novel elements
- **Coherence**: Creative focus provides clear direction
- **Potential**: Shows clear path for growth and development

### When to Regenerate
- **Lack of Inspiration**: Suggestions don't spark creative interest
- **Too Familiar**: All suggestions feel like rehashing old ideas
- **Too Chaotic**: Suggestions are too disconnected or random
- **Wrong Direction**: Suggestions don't align with your goals

### Customization Options
- **Adjust Creativity**: Try different creativity levels for variety
- **Change Quantity**: Generate more/fewer suggestions as needed
- **Focus Refinement**: Specify particular growth areas
- **Context Addition**: Provide extra context for more tailored suggestions

## Integration with Broader Workflow

### Complete Growth Cycle
1. **Create** → Log meditation with `bridge_log_meditation`
2. **Critique** → Get context with `bridge_get_context_for_consult`, consult, log with `bridge_log_consult`
3. **Extract** → Get feedback with `bridge_get_critique_for_meditation`
4. **Grow** → Generate next meditation with `bridge_generate_next_meditation`
5. **Repeat** → Continue cycle for ongoing development

### Mode Switch Integration
- Use `bridge_suggest_mode_switch()` to know when to shift
- Generate suggestions when switching back to diverge mode
- Use suggestions to inform mode switch decisions

### Session Management
- Generate suggestions within active sessions for context continuity
- Use session traces to understand creative evolution
- Resume sessions to continue long-term development threads

## Troubleshooting

### No Suggestions Generated
- **Cause**: Critique trace not found or invalid
- **Solution**: Verify trace ID with `bridge_get_session_trace`
- **Check**: Ensure critique was properly logged

### Uninspiring Suggestions
- **Cause**: Feedback concepts too limited or generic
- **Solution**: Try different creativity levels or regenerate
- **Enhancement**: Provide more specific growth focus

### Suggestions Too Similar
- **Cause**: Feedback concepts are repetitive
- **Solution**: Increase creativity level for more variety
- **Alternative**: Generate more suggestions to increase options

### Context Overload
- **Cause**: Too many context words suggested
- **Solution**: Manually reduce context words to focus
- **Strategy**: Prioritize the most intriguing words

Remember: This tool represents the "growth factor" in your contemplative process. By transforming critique into creative inspiration, it enables thoughts to evolve and develop organically. Each cycle builds on the previous, creating increasingly sophisticated and meaningful explorations."""

    messages = [
        {
            "role": "user",
            "content": base_content
        }
    ]

    return messages


if __name__ == "__main__":
    mcp.run()
