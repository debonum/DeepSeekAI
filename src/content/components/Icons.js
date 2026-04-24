import {
  createElement,
  MessageCircle, // Chat icon
  Copy,
  Languages,
  Lightbulb,
  List,
  Mail,
  Search,
  RefreshCw,
  Send,
  Check,
  GripVertical
} from 'lucide';

// Helper to render Lucide icon to SVG string
const getSvg = (icon, attrs = {}) => {
  const element = createElement(icon);
  // Default styling to match existing (stroke-width 2 is standard in Lucide)
  // Ensure currentColor inheritance for dark/light mode adaptability
  element.setAttribute('stroke', 'currentColor');
  element.setAttribute('fill', 'none');

  Object.entries(attrs).forEach(([k, v]) => element.setAttribute(k, v));
  return element.outerHTML;
};

export const ICONS = {
  // Chat / Main (Sparkles/Bubble)
  icon24: getSvg(MessageCircle),

  // Copy (Two rectangles)
  icon_copy: getSvg(Copy),
  copy: getSvg(Copy),

  // Translate (Circular arrows with A)
  translate: getSvg(Languages),

  // Explain (Lightbulb/Spark)
  explain: getSvg(Lightbulb),

  // Summarize (List/Lines)
  summarize: getSvg(List),

  // Email (Envelope)
  email: getSvg(Mail),

  // Analyze (Magnifying glass / Chart)
  analyze: getSvg(Search),

  // Regenerate (Arrows)
  regenerate: getSvg(RefreshCw),

  // Send (Paper plane)
  send: getSvg(Send),

  // Check (Checkmark)
  check: getSvg(Check),

  // New: Extracted from QuickActionButtons.js inline SVGs
  dragHandle: getSvg(GripVertical),
  askAi: getSvg(MessageCircle)
};
