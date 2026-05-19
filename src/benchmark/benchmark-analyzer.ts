/**
 * Benchmark Results Analyzer and Visualizer
 */

import type { TestResults } from './test-runner';
import type { BenchmarkResult } from './evaluation-metrics';

export interface BenchmarkAnalysis {
  overview: {
    totalTests: number;
    passRate: number;
    averageScore: number;
  };
  byDomain: Record<string, DomainStats>;
  byFieldType: Record<string, FieldTypeStats>;
  weakAreas: string[];
  strongAreas: string[];
  recommendations: string[];
}

export interface DomainStats {
  domain: string;
  testCount: number;
  averageCompletion: number;
  averageClickAccuracy: number;
  averageValueAccuracy: number;
  overallScore: number;
}

export interface FieldTypeStats {
  fieldType: string;
  testCount: number;
  averageClickAccuracy: number;
  averageValueAccuracy: number;
  failureRate: number;
}

export class BenchmarkAnalyzer {
  /**
   * Analyze benchmark results
   */
  static analyze(results: TestResults[]): BenchmarkAnalysis {
    const overview = this.getOverview(results);
    const byDomain = this.analyzeByDomain(results);
    const byFieldType = this.analyzeByFieldType(results);
    const weakAreas = this.identifyWeakAreas(results);
    const strongAreas = this.identifyStrongAreas(results);
    const recommendations = this.generateRecommendations(
      weakAreas,
      strongAreas,
      byDomain
    );

    return {
      overview,
      byDomain,
      byFieldType,
      weakAreas,
      strongAreas,
      recommendations,
    };
  }

  private static getOverview(results: TestResults[]) {
    const totalTests = results.length;
    const passedTests = results.filter(
      r => r.episodicMetric.formCompletionRate > 50
    ).length;
    const avgScore =
      results.reduce((sum, r) => sum + r.detailedResults.overallScore, 0) /
      totalTests;

    return {
      totalTests,
      passRate: (passedTests / totalTests) * 100,
      averageScore: avgScore,
    };
  }

  private static analyzeByDomain(
    results: TestResults[]
  ): Record<string, DomainStats> {
    const domainMap: Record<string, TestResults[]> = {};

    for (const result of results) {
      const domain = result.testCase.domain;
      if (!domainMap[domain]) {
        domainMap[domain] = [];
      }
      domainMap[domain].push(result);
    }

    const stats: Record<string, DomainStats> = {};

    for (const [domain, domainResults] of Object.entries(domainMap)) {
      const avgCompletion =
        domainResults.reduce(
          (sum, r) => sum + r.episodicMetric.formCompletionRate,
          0
        ) / domainResults.length;

      const avgClickAccuracy =
        domainResults.reduce(
          (sum, r) => sum + r.episodicMetric.averageClickAccuracy,
          0
        ) / domainResults.length;

      const avgValueAccuracy =
        domainResults.reduce(
          (sum, r) => sum + r.episodicMetric.averageValueAccuracy,
          0
        ) / domainResults.length;

      const overallScore =
        domainResults.reduce(
          (sum, r) => sum + r.detailedResults.overallScore,
          0
        ) / domainResults.length;

      stats[domain] = {
        domain,
        testCount: domainResults.length,
        averageCompletion: avgCompletion,
        averageClickAccuracy: avgClickAccuracy,
        averageValueAccuracy: avgValueAccuracy,
        overallScore,
      };
    }

    return stats;
  }

  private static analyzeByFieldType(
    results: TestResults[]
  ): Record<string, FieldTypeStats> {
    const fieldTypeMap: Record<string, BenchmarkResult[]> = {};

    for (const result of results) {
      for (const metric of result.atomicMetrics) {
        const ft = metric.fieldType;
        if (!fieldTypeMap[ft]) {
          fieldTypeMap[ft] = [];
        }
        fieldTypeMap[ft].push({
          modelName: 'Test',
          atomic: result.atomicMetrics,
          episodic: result.episodicMetric,
          timestamp: Date.now(),
        });
      }
    }

    const stats: Record<string, FieldTypeStats> = {};

    for (const [fieldType, results] of Object.entries(fieldTypeMap)) {
      const avgClickAccuracy =
        results.reduce((sum, r) => {
          const m = r.atomic.find(a => a.fieldType === fieldType);
          return sum + (m?.clickAccuracy || 0);
        }, 0) / results.length;

      const avgValueAccuracy =
        results.reduce((sum, r) => {
          const m = r.atomic.find(a => a.fieldType === fieldType);
          return sum + (m?.valueAccuracy || 0);
        }, 0) / results.length;

      const failureRate =
        results.filter(r => {
          const m = r.atomic.find(a => a.fieldType === fieldType);
          return !m || m.valueAccuracy < 50;
        }).length / results.length;

      stats[fieldType] = {
        fieldType,
        testCount: results.length,
        averageClickAccuracy: avgClickAccuracy,
        averageValueAccuracy: avgValueAccuracy,
        failureRate: failureRate * 100,
      };
    }

    return stats;
  }

  private static identifyWeakAreas(results: TestResults[]): string[] {
    const weakAreas: string[] = [];

    // Find domains with low performance
    const byDomain = this.analyzeByDomain(results);
    for (const [domain, stats] of Object.entries(byDomain)) {
      if (stats.overallScore < 30) {
        weakAreas.push(`Domain: ${domain} (${stats.overallScore.toFixed(1)}%)`);
      }
    }

    // Find field types with low click accuracy
    const byFieldType = this.analyzeByFieldType(results);
    for (const [fieldType, stats] of Object.entries(byFieldType)) {
      if (stats.averageClickAccuracy < 20) {
        weakAreas.push(
          `Field Type: ${fieldType} - Click Accuracy (${stats.averageClickAccuracy.toFixed(1)}%)`
        );
      }
    }

    return weakAreas.slice(0, 5); // Top 5 weak areas
  }

  private static identifyStrongAreas(results: TestResults[]): string[] {
    const strongAreas: string[] = [];

    // Find domains with high performance
    const byDomain = this.analyzeByDomain(results);
    for (const [domain, stats] of Object.entries(byDomain)) {
      if (stats.overallScore > 70) {
        strongAreas.push(`Domain: ${domain} (${stats.overallScore.toFixed(1)}%)`);
      }
    }

    // Find field types with high accuracy
    const byFieldType = this.analyzeByFieldType(results);
    for (const [fieldType, stats] of Object.entries(byFieldType)) {
      if (stats.averageValueAccuracy > 80) {
        strongAreas.push(
          `Field Type: ${fieldType} - Value Accuracy (${stats.averageValueAccuracy.toFixed(1)}%)`
        );
      }
    }

    return strongAreas.slice(0, 5); // Top 5 strong areas
  }

  private static generateRecommendations(
    weakAreas: string[],
    strongAreas: string[],
    byDomain: Record<string, DomainStats>
  ): string[] {
    const recommendations: string[] = [];

    // Check click accuracy
    const avgClickAccuracy =
      Object.values(byDomain).reduce((sum, d) => sum + d.averageClickAccuracy, 0) /
      Object.values(byDomain).length;

    if (avgClickAccuracy < 20) {
      recommendations.push('Enable Ruler-Enhanced Strategy to improve click accuracy');
      recommendations.push('Invest in better visual grounding and spatial reasoning');
    }

    // Check for specific weak domains
    for (const [domain, stats] of Object.entries(byDomain)) {
      if (stats.averageCompletion < 30) {
        recommendations.push(`Develop specialized agent for ${domain} domain`);
      }
    }

    // Multi-page form handling
    const multiPageResults = Object.values(byDomain).filter(d => d.testCount > 5);
    if (
      multiPageResults.some(d => d.averageCompletion < 40)
    ) {
      recommendations.push('Improve multi-page form navigation logic');
    }

    recommendations.push('Consider fine-tuning models on FormFactory dataset');
    recommendations.push('Implement field dependency detection for complex forms');

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Generate detailed text report
   */
  static generateReport(analysis: BenchmarkAnalysis): string {
    let report = `
╔════════════════════════════════════════════════════════════════╗
║         FormFactory Benchmark Analysis Report                  ║
╚════════════════════════════════════════════════════════════════╝

📊 OVERVIEW:
├─ Total Tests: ${analysis.overview.totalTests}
├─ Pass Rate (>50% completion): ${analysis.overview.passRate.toFixed(2)}%
└─ Average Score: ${analysis.overview.averageScore.toFixed(2)}%

🌍 PERFORMANCE BY DOMAIN:
`;

    for (const [domain, stats] of Object.entries(analysis.byDomain)) {
      report += `
├─ ${domain}
│  ├─ Tests: ${stats.testCount}
│  ├─ Completion: ${stats.averageCompletion.toFixed(2)}%
│  ├─ Click Accuracy: ${stats.averageClickAccuracy.toFixed(2)}%
│  ├─ Value Accuracy: ${stats.averageValueAccuracy.toFixed(2)}%
│  └─ Overall Score: ${stats.overallScore.toFixed(2)}%
`;
    }

    report += `
📋 PERFORMANCE BY FIELD TYPE:
`;

    for (const [fieldType, stats] of Object.entries(analysis.byFieldType)) {
      report += `
├─ ${fieldType}
│  ├─ Tests: ${stats.testCount}
│  ├─ Click Accuracy: ${stats.averageClickAccuracy.toFixed(2)}%
│  ├─ Value Accuracy: ${stats.averageValueAccuracy.toFixed(2)}%
│  └─ Failure Rate: ${stats.failureRate.toFixed(2)}%
`;
    }

    report += `
⚠️  WEAK AREAS (Needs Improvement):
`;
    analysis.weakAreas.forEach((area, i) => {
      report += `  ${i + 1}. ${area}\n`;
    });

    report += `
✅ STRONG AREAS (Performing Well):
`;
    analysis.strongAreas.forEach((area, i) => {
      report += `  ${i + 1}. ${area}\n`;
    });

    report += `
💡 RECOMMENDATIONS:
`;
    analysis.recommendations.forEach((rec, i) => {
      report += `  ${i + 1}. ${rec}\n`;
    });

    report += `
═══════════════════════════════════════════════════════════════
Generated: ${new Date().toISOString()}
`;

    return report;
  }
}
