# Memory Graph Explorer Frontend

A modern Next.js dashboard for visualizing and exploring AI memory graphs with semantic search and versioning capabilities.

## Features

- **Semantic Search**: Natural language search with vector similarity
- **Graph Visualization**: Interactive Neo4j-style graph rendering
- **Memory Management**: Create, update, and manage memory nodes
- **Timeline View**: Track memory evolution and relationship changes
- **Node Inspector**: Detailed memory analysis and relationship exploration
- **Responsive Design**: Modern UI with Shadcn components

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_API_BASE=http://localhost:8000
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Search & Explore (main page)
│   ├── memories/          # Memory management
│   ├── timeline/          # Timeline visualization
│   └── graph/             # Full-screen graph explorer
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   ├── DashboardLayout.tsx
│   ├── SearchForm.tsx
│   ├── MemoryForm.tsx
│   ├── Neo4jGraphView.tsx
│   └── NodeInspector.tsx
└── lib/                  # Utilities and API functions
    └── api.ts
```

## Pages

### Search & Explore (`/`)
- Main dashboard with semantic search
- Interactive graph visualization
- Search results with similarity scores
- Node inspector sidebar

### Memory Management (`/memories`)
- Create new memories
- View all memories with status indicators
- Statistics dashboard
- Memory timeline

### Timeline (`/timeline`)
- Chronological view of memory events
- Filter by status and operation type
- Relationship tracking
- Visual timeline with operation icons

### Graph Explorer (`/graph`)
- Full-screen graph visualization
- Advanced search and filtering
- Toggle node inspector
- Status-based node filtering

## API Integration

The frontend integrates with the Memory Graph API backend:

- **Search**: `POST /search` - Semantic search with graph expansion
- **Memories**: `GET/POST /memories` - Memory CRUD operations
- **Timeline**: `GET /timeline` - Memory evolution tracking
- **Relationships**: Various endpoints for memory linking

## Technologies

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Shadcn UI** - Modern component library
- **Lucide React** - Icon library
- **React Force Graph** - Graph visualization
- **D3.js** - Data visualization utilities

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Graph Visualization

The graph visualization uses a Neo4j-inspired design with:

- **Node Colors**: Status-based (active = cyan, outdated = gray)
- **Relationship Arrows**: Directional edges with type labels
- **Interactive Controls**: Pan, zoom, click to focus
- **Hover Effects**: Node highlighting and tooltips
- **Force Layout**: Automatic node positioning

## Memory Operations

Supported memory operations:

- **CREATE**: New memory nodes
- **UPDATE**: Version evolution (supersede)
- **EXTEND**: Add related context
- **DERIVE**: Create derived insights
- **LINK**: Manual relationship creation
- **MERGE**: Duplicate node consolidation
