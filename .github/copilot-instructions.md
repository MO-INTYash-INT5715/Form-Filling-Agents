# This file provides AI-enhanced context for VS Code Copilot in this workspace

## Project Type
Web Browser Extension for AI-powered Form Filling Agents

## Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Extension APIs**: Chrome Manifest V3, Firefox Manifest V2
- **Styling**: Tailwind CSS
- **Build**: TypeScript compiler, Next.js build system

## Key Objectives
1. Implement multi-browser extension (Chrome, Firefox, Edge)
2. Develop form detection and analysis system
3. Build extensible agent framework for form filling
4. Create settings UI for configuration
5. Support commercial forms and document uploads

## Core Components

### Agents (`src/agents/`)
- `CommercialFormAgent`: Fills commercial data forms using pattern matching
- `DocumentUploadAgent`: Detects and validates file upload fields
- `AdaptiveFormAgent`: Routes forms to appropriate agents

### Form Processing (`src/utils/`)
- `form-detection.ts`: Analyzes DOM for forms and fields
- `form-filler.ts`: Executes filling logic with different field types
- `storage.ts`: Manages extension storage and messaging

### Extension Modules
- `content-script.ts`: Runs on pages, detects forms, communicates with background
- `service-worker.ts`: Manages extension state, agent orchestration
- UI pages: Popup and options (Next.js based)

## Development Guidelines

### Adding Features
1. Define types in `src/types/index.ts`
2. Implement utilities in `src/utils/`
3. Create agents in `src/agents/`
4. Update UI components as needed

### Testing Locally
- Build: `npm run build`
- Load unpacked in Chrome: `chrome://extensions/`
- Load temporary add-on in Firefox: `about:debugging`

### Browser Compatibility
- Use Chrome APIs with fallbacks for Firefox
- Test both manifest versions
- Keep API usage compatible with both browsers

## Reference Material
- Paper: https://arxiv.org/abs/2506.01520
- Chrome API Docs: https://developer.chrome.com/docs/extensions/
- Firefox API Docs: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/

## Next Steps
1. Install dependencies: `npm install`
2. Build extension: `npm run build`
3. Load in browser for testing
4. Implement AI backend integration (OpenAI/Anthropic)
