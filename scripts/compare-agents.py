#!/usr/bin/env python3
"""
Aggregate benchmark results across all agents and generate comparison table.

Reads JSON files from benchmark-results/<agent>/ and computes:
- Accuracy (click + value)
- Form completion rate
- Average latency
- Cost per form (if available)
"""

import json
import os
from collections import defaultdict
from pathlib import Path
from typing import Dict, List

def load_agent_results(agent_name: str, base_dir: Path) -> List[Dict]:
    """Load all JSON results for a given agent."""
    agent_dir = base_dir / agent_name
    if not agent_dir.exists():
        return []
    
    results = []
    for file in agent_dir.glob("*.json"):
        try:
            with open(file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                results.append(data)
        except Exception as e:
            print(f"Warning: Failed to load {file}: {e}")
    
    return results

def compute_metrics(results: List[Dict]) -> Dict:
    """Compute aggregate metrics from result set."""
    if not results:
        return {
            'forms': 0,
            'click_accuracy': 0.0,
            'value_accuracy': 0.0,
            'completion_rate': 0.0,
            'avg_latency_ms': 0.0,
            'total_cost': 0.0
        }
    
    total_clicks_correct = 0
    total_clicks = 0
    total_values_correct = 0
    total_values = 0
    completed_forms = 0
    total_latency = 0.0
    total_cost = 0.0
    
    for result in results:
        # Parse fieldResults array
        if 'fieldResults' in result:
            for field in result['fieldResults']:
                # Click accuracy
                if 'clickAccurate' in field and field['clickAccurate'] is not None:
                    total_clicks += 1
                    if field['clickAccurate']:
                        total_clicks_correct += 1
                
                # Value accuracy
                if 'valueAccurate' in field and field['valueAccurate'] is not None:
                    total_values += 1
                    if field['valueAccurate']:
                        total_values_correct += 1
        
        # Completion (assume completed if we have results, unless explicitly marked failed)
        if 'completed' in result:
            if result['completed']:
                completed_forms += 1
        elif 'fieldResults' in result and len(result['fieldResults']) > 0:
            # If no completion flag, assume success if fields were attempted
            completed_forms += 1
        
        # Latency
        if 'durationMs' in result:
            total_latency += result['durationMs']
        elif 'duration' in result:
            total_latency += result['duration'] * 1000  # Convert seconds to ms
        
        # Cost
        if 'estimatedCost' in result:
            total_cost += result['estimatedCost']
        elif 'cost' in result:
            total_cost += result['cost']
    
    return {
        'forms': len(results),
        'click_accuracy': (total_clicks_correct / total_clicks * 100) if total_clicks > 0 else 0.0,
        'value_accuracy': (total_values_correct / total_values * 100) if total_values > 0 else 0.0,
        'completion_rate': (completed_forms / len(results) * 100) if results else 0.0,
        'avg_latency_ms': (total_latency / len(results)) if results else 0.0,
        'total_cost': total_cost
    }

def main():
    base_dir = Path(__file__).parent.parent / "extension" / "benchmark-results"
    
    if not base_dir.exists():
        print(f"Error: {base_dir} not found")
        return
    
    # Discover all agent directories
    agents = [d.name for d in base_dir.iterdir() if d.is_dir()]
    
    if not agents:
        print("No agent results found")
        return
    
    print("# Form Filling Agents — Benchmark Comparison\n")
    print(f"**Source**: `{base_dir.relative_to(Path.cwd())}`\n")
    
    # Collect metrics
    agent_metrics = {}
    for agent in sorted(agents):
        results = load_agent_results(agent, base_dir)
        if results:
            agent_metrics[agent] = compute_metrics(results)
    
    # Print table
    print("| Agent | Forms | Click Acc | Value Acc | Completion | Avg Latency | Cost |")
    print("|-------|-------|-----------|-----------|------------|-------------|------|")
    
    for agent, metrics in sorted(agent_metrics.items(), key=lambda x: x[1]['value_accuracy'], reverse=True):
        print(f"| {agent:20s} | {metrics['forms']:5d} | "
              f"{metrics['click_accuracy']:6.1f}% | "
              f"{metrics['value_accuracy']:6.1f}% | "
              f"{metrics['completion_rate']:6.1f}% | "
              f"{metrics['avg_latency_ms']:7.0f}ms | "
              f"${metrics['total_cost']:.4f} |")
    
    print("\n## Metric Definitions\n")
    print("- **Click Accuracy**: % of form fields correctly identified and clicked")
    print("- **Value Accuracy**: % of field values correctly filled")
    print("- **Completion Rate**: % of forms successfully submitted")
    print("- **Avg Latency**: Average time per form (includes network, rendering)")
    print("- **Cost**: Total API cost (LLM/embedding calls) across all benchmark runs")
    
    print("\n## Best Performer\n")
    
    if agent_metrics:
        best_value = max(agent_metrics.items(), key=lambda x: x[1]['value_accuracy'])
        best_speed = min(agent_metrics.items(), key=lambda x: x[1]['avg_latency_ms'])
        best_cost = min(agent_metrics.items(), key=lambda x: x[1]['total_cost'])
        
        print(f"- **Accuracy**: {best_value[0]} ({best_value[1]['value_accuracy']:.1f}% value accuracy)")
        print(f"- **Speed**: {best_speed[0]} ({best_speed[1]['avg_latency_ms']:.0f}ms avg)")
        print(f"- **Cost**: {best_cost[0]} (${best_cost[1]['total_cost']:.4f} total)")

if __name__ == "__main__":
    main()
