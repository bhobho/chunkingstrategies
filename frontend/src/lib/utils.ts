import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CHUNK_COLORS = [
  { bg: 'rgba(59,130,246,0.15)', border: '#3b82f6', text: '#93c5fd', name: 'blue' },
  { bg: 'rgba(139,92,246,0.15)', border: '#8b5cf6', text: '#c4b5fd', name: 'purple' },
  { bg: 'rgba(6,182,212,0.15)', border: '#06b6d4', text: '#67e8f9', name: 'cyan' },
  { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#6ee7b7', name: 'green' },
  { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#fcd34d', name: 'amber' },
  { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#fca5a5', name: 'red' },
  { bg: 'rgba(236,72,153,0.15)', border: '#ec4899', text: '#f9a8d4', name: 'pink' },
  { bg: 'rgba(99,102,241,0.15)', border: '#6366f1', text: '#a5b4fc', name: 'indigo' },
]

export const STRATEGY_DESCRIPTIONS: Record<string, { title: string; desc: string; pros: string[]; cons: string[] }> = {
  fixed_size: {
    title: 'Fixed Size Chunking',
    desc: 'Splits text into chunks of a fixed character count with configurable overlap.',
    pros: ['Simple and predictable', 'Fast to compute', 'Consistent chunk sizes'],
    cons: ['Can split mid-sentence', 'Ignores semantic boundaries', 'May break context'],
  },
  recursive: {
    title: 'Recursive Chunking',
    desc: 'Recursively splits using a hierarchy: paragraphs → sentences → words.',
    pros: ['Respects natural boundaries', 'Flexible chunk sizes', 'Good general-purpose choice'],
    cons: ['More complex logic', 'Variable chunk sizes', 'Slightly slower'],
  },
  paragraph: {
    title: 'Paragraph Chunking',
    desc: 'Splits text on double newlines (paragraph boundaries).',
    pros: ['Natural document structure', 'Preserves paragraph context', 'Simple'],
    cons: ['Variable sizes', 'Long paragraphs can be too large', 'Short paragraphs can be too small'],
  },
  sentence: {
    title: 'Sentence Chunking',
    desc: 'Splits text into individual sentences using NLP boundaries.',
    pros: ['Granular retrieval', 'Precise context', 'Works well for Q&A'],
    cons: ['Many small chunks', 'Higher embedding cost', 'May miss inter-sentence context'],
  },
  markdown: {
    title: 'Markdown Chunking',
    desc: 'Splits on Markdown headers (# ## ###), preserving document hierarchy.',
    pros: ['Respects document structure', 'Great for docs/wikis', 'Meaningful sections'],
    cons: ['Only works for Markdown', 'Headers may be missing', 'Section sizes vary widely'],
  },
  semantic: {
    title: 'Semantic Chunking',
    desc: 'Groups sentences by topic similarity using keyword overlap analysis.',
    pros: ['Topic-coherent chunks', 'Best retrieval quality', 'Understands meaning'],
    cons: ['Slower computation', 'Requires NLP', 'Non-deterministic sizes'],
  },
  agentic: {
    title: 'Agentic Chunking',
    desc: 'Simulates an AI agent deciding chunk boundaries based on content importance.',
    pros: ['Intelligent boundaries', 'Prioritizes key content', 'Context-aware'],
    cons: ['Requires LLM calls', 'Expensive', 'Slower than other methods'],
  },
  contextual: {
    title: 'Contextual Chunking',
    desc: 'Sentence chunking that includes surrounding sentences as context metadata.',
    pros: ['Rich context per chunk', 'Great for complex Q&A', 'Reduces context loss'],
    cons: ['Larger metadata overhead', 'More complex prompts', 'Higher token usage'],
  },
}

export const SAMPLE_TEXTS = {
  technical: `# Introduction to Machine Learning

Machine learning is a subset of artificial intelligence that enables computers to learn from experience without being explicitly programmed. It focuses on developing algorithms that can access data and use it to learn for themselves.

## Types of Machine Learning

### Supervised Learning
Supervised learning involves training a model on labeled data. The algorithm learns to map inputs to outputs based on example input-output pairs. Common applications include spam detection, image classification, and price prediction.

### Unsupervised Learning
Unsupervised learning finds hidden patterns in data without pre-existing labels. Clustering algorithms like K-means group similar data points together. Principal Component Analysis (PCA) reduces dimensionality while preserving important information.

### Reinforcement Learning
Reinforcement learning trains agents to make sequences of decisions. An agent learns by interacting with an environment, receiving rewards or penalties for its actions. This approach has achieved superhuman performance in games like Chess and Go.

## Neural Networks

Neural networks are inspired by the human brain's structure. They consist of layers of interconnected nodes that process information. Deep learning uses networks with many layers to learn complex representations.

The transformer architecture, introduced in 2017, revolutionized natural language processing. Models like GPT and BERT use attention mechanisms to understand context across long sequences of text.

## Applications

Machine learning powers many modern technologies. Recommendation systems suggest products and content tailored to individual users. Computer vision enables autonomous vehicles to perceive their environment. Natural language processing allows virtual assistants to understand and generate human language.`,

  finance: `Q1 2024 Financial Results Report

Executive Summary
TechCorp Inc. delivered strong results in the first quarter of 2024, with revenue growing 23% year-over-year to $2.4 billion. Operating income increased by 31% to $680 million, reflecting improved operational efficiency and scale benefits.

Revenue Breakdown
Cloud services revenue reached $1.8 billion, representing 75% of total revenue and growing 35% year-over-year. Enterprise software licenses contributed $400 million, up 8% from Q1 2023. Professional services generated $200 million in revenue, growing 12%.

Geographic Performance
North America remains our largest market with $1.5 billion in revenue, representing 63% of the total. European markets contributed $600 million, showing 18% growth driven by new enterprise wins. Asia Pacific grew 42% to $300 million, our fastest-growing region.

Product Highlights
The launch of our AI-powered analytics platform exceeded expectations, acquiring 2,400 enterprise customers in its first quarter. Average contract value increased to $285,000, up from $210,000 in the prior year period.

Outlook
We are raising our full-year 2024 revenue guidance to $9.8-10.2 billion, representing 20-24% growth. Operating margin is expected to expand by 200-300 basis points. Capital expenditure guidance remains at $800 million for infrastructure investments.`,
}
