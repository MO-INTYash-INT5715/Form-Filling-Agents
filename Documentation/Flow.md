# Form Filling Agents Pipeline Flow

## Overview

This document outlines the end-to-end architecture and pipeline for the Form Filling Agents project. The pipeline is designed to compare different agent implementations against a standardized benchmark using Playwright.

## Pipeline Architecture

### 1. Data Ingestion (Input Pipeline)
- **Input Documents (`data2/*.txt`)**: Raw, unstructured text representing the data payload (e.g., CVs, emails, letters) that needs to be filled into the form.
- **Gold Answers (`data1/*.json`)**: Ground truth structured data representing the exact values that must be populated in the form fields.
- **Future Enhancement**: Integration of a State-of-the-Art (SOTA) data parser to automatically parse unstructured `inputDocument` text into a structured JSON representation, abstracting away the text parsing complexity from the agent logic.

### 2. Form Instances Server
- **Flask Server (`http://localhost:5000`)**: A local web server hosting 25 distinct HTML form templates across 8 domains (e.g., Healthcare, Legal, Academic).
- Serves as the interactive DOM environment for agents to explore and interact with.

### 3. Agent Implementations
All agents conform to the `BenchmarkAgent` interface, taking a `FormInstance` (containing the `inputDocument`) and returning a list of `AgentAction` sequences (type, click, select). Implementations are strictly isolated into separate folders within `src/implementations/` to prevent code overlap.

- **Baseline Rule-Based Method (`src/implementations/rule-based/`)**: 
  - Uses regex and NLP heuristics to extract data from the `inputDocument`.
  - Predicts values based on string matching and basic rules.
  - Achieves a baseline accuracy (~8%).
- **Future Methods (e.g., Vision-Language Models, DOM-parsing LLMs)**: 
  - To be developed for comparative analysis.
  - Will leverage advanced visual grounding or structured DOM traversal.

### 4. Playwright Execution Engine (`src/benchmark/playwright-executor.ts`)
- Replaces PyAutoGUI with robust, headless browser automation via Node.js native Playwright.
- Translates `AgentAction` objects into actual browser events (filling inputs, clicking checkboxes, selecting dropdowns).
- Handles field resolution by mapping conceptual `fieldId` labels to specific DOM elements using robust selectors.

### 5. Benchmark Runner (`scripts/run-benchmark.ts`)
- Orchestrates the evaluation.
- Compares the agent's actions and the resulting DOM state against the `goldAnswers`.
- Generates detailed metrics (Click Accuracy, Value Accuracy, Form Completion Rate) per form, per field type, and per domain.
- Outputs results to `benchmark-results/<agent-name>/`.
