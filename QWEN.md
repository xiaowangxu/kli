# KLI Project Documentation

## Project Overview

KLI is a terminal-based user interface (TUI) library built with TypeScript that provides a component-based approach to creating rich terminal interfaces. The project uses Yoga Layout for flexbox-style layout management and provides a rendering system that can draw complex UI components in the terminal.

**Main Technologies:**
- TypeScript for type-safe development
- Yoga Layout (flexbox-based layout engine, similar to CSS Flexbox)
- Node.js for terminal interaction
- Custom rendering engine using ANSI escape codes

## Architecture

The project is organized into several modules:

- **Node**: Core UI components including Container, TextContainer, Text, and TextContent
- **Render**: Rendering engine that handles drawing to the terminal using ANSI codes
- **Scene**: Scene graph management for organizing UI components
- **Layout**: Layout calculation using Yoga Layout
- **Style**: Styling capabilities including borders, colors, and text styling
- **Input**: Input handling from terminal
- **Util**: Utility functions and classes

## Key Features

1. **Flexbox Layout**: Uses Yoga Layout for sophisticated component positioning and sizing
2. **Rich Text Rendering**: Supports multi-colored text, styling, and text wrapping
3. **Component Hierarchy**: Tree-based component structure with parent-child relationships
4. **Terminal Rendering**: Efficient terminal rendering using ANSI escape sequences
5. **Color Support**: RGB color support for both foreground and background
6. **Border Styling**: Different border types and colors
7. **Shader Support**: Custom shader functions for advanced visual effects
8. **Unicode Support**: Full Unicode and emoji support with proper character width calculations

## Building and Running

### Prerequisites
- Node.js (version compatible with package.json)
- npm or yarn

### Development Commands

```bash
# Install dependencies
npm install

# Run in development mode with file watching
npm run dev

# Build the project
npm run build

# Start the built application
npm run start

# Clean build artifacts
npm run clean
```

### Development Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development mode with auto-recompilation
4. The project uses tsx for running TypeScript files in development

### Build System

- The project uses `tsup` for building
- Outputs CommonJS and ESM modules
- Generates declaration files (`.d.ts`)
- Targets Node.js 20
- Uses TypeScript with strict mode enabled

## Core Concepts

### Components

The library provides several core component types:
- `Container`: Flexbox-style container for layout
- `TextContainer`: Handles text rendering and wrapping
- `Text`: Text element for styling and hierarchy
- `TextContent`: Actual text content with style properties

### Layout

Layout calculation is performed using Yoga Layout with flexbox properties like:
- `flex_direction` (Row/Column)
- `align_items`
- `justify_content`
- `gap`
- `flex_grow`, `flex_shrink`, `flex_basis`

### Rendering

The rendering system uses a double-buffer approach to efficiently update the terminal:
1. Components draw to an in-memory buffer
2. The buffer is compared with the current terminal state
3. Only differences are sent to the terminal using ANSI escape codes

## Usage Examples

The `dev.ts` file demonstrates usage of the library, including:
- Creating containers with flexbox properties
- Adding text content with different styles
- Using shader functions for dynamic visual effects
- Setting up input handling

## Dependencies

- `yoga-layout`: Flexbox layout engine
- `chalk`: Terminal string styling
- `readline`: Node.js readline module
- `@types/node`: TypeScript definitions for Node.js
- `tsup`: Build tool
- `tsx`: TypeScript runner for development

## Development Conventions

- TypeScript is used throughout the project
- Strict TypeScript mode is enabled
- Module resolution follows NodeNext convention
- ES2022 target for modern JavaScript features
- All source code is located in the `src` directory
- Components follow a parent-child relationship pattern
- Layout changes trigger automatic re-rendering